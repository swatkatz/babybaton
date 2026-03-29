package prediction

import (
	"crypto/sha256"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Input types for the prediction engine

// FeedRecord represents a single feed event for prediction purposes.
type FeedRecord struct {
	StartTime time.Time
	EndTime   *time.Time
	AmountMl  *int
	FeedType  *domain.FeedType
}

// SleepRecord represents a single sleep event for prediction purposes.
type SleepRecord struct {
	StartTime       time.Time
	EndTime         *time.Time
	DurationMinutes *int
	CareSessionID   uuid.UUID
}

const (
	napMaxMinutes       = 200
	daytimeStartHour    = 6
	daytimeEndHour      = 22
	minFeedInterval     = 1 * time.Hour
	maxFeedInterval     = 8 * time.Hour
	minWakeWindow       = 1 * time.Hour
	maxWakeWindow       = 6 * time.Hour
	maxPredictions = 20
)

// GeneratePredictions produces a timeline of predictions given recent feed and sleep data.
// now is the current time, timezone is the family's local timezone string.
func GeneratePredictions(now time.Time, feeds []FeedRecord, sleeps []SleepRecord, timezone string) []*domain.Prediction {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}

	var predictions []*domain.Prediction

	// --- Feed predictions ---
	feedPred := generateFeedPrediction(now, feeds, loc)
	if feedPred != nil {
		predictions = append(predictions, feedPred)
	}

	// --- Feed amount prediction ---
	amountPred := generateFeedAmountPrediction(now, feeds, feedPred, loc)
	if amountPred != nil && feedPred != nil {
		// Merge amount into the feed prediction
		feedPred.PredictedAmountMl = amountPred
	}

	// --- Sleep predictions ---
	sleepPreds := generateSleepPredictions(now, sleeps, loc)
	predictions = append(predictions, sleepPreds...)

	// --- Bedtime prediction ---
	bedtimePred := generateBedtimePrediction(now, sleeps, loc)
	if bedtimePred != nil {
		predictions = append(predictions, bedtimePred)
	}

	// --- Chain forward until bedtime ---
	predictions = chainPredictions(now, predictions, feeds, sleeps, loc)

	// Cap at maxPredictions
	if len(predictions) > maxPredictions {
		predictions = predictions[:maxPredictions]
	}

	// Set computed_at and created_at, generate stable IDs
	for _, p := range predictions {
		p.ComputedAt = now
		p.CreatedAt = now
		p.ID = stableID(p.PredictionType, p.PredictedTime)
	}

	return predictions
}

// generateFeedPrediction computes the next feed prediction from historical feed data.
func generateFeedPrediction(now time.Time, feeds []FeedRecord, loc *time.Location) *domain.Prediction {
	daytimeFeeds := filterDaytimeFeeds(feeds, loc)
	if len(daytimeFeeds) < 2 {
		if len(daytimeFeeds) == 0 {
			return nil
		}
		// With only 1 feed, we can't compute an interval
		return nil
	}

	intervals := computeFeedIntervals(daytimeFeeds)
	filteredIntervals := filterFeedIntervals(intervals)
	if len(filteredIntervals) == 0 {
		return nil
	}

	medianInterval := medianDuration(filteredIntervals)

	// Find the most recent feed (regardless of daytime filter, to anchor from)
	lastFeed := findLastFeed(feeds)
	if lastFeed == nil {
		return nil
	}

	predictedTime := lastFeed.StartTime.Add(medianInterval)
	confidence := computeConfidence(len(filteredIntervals), stddevDuration(filteredIntervals), medianInterval)
	status := assignStatus(predictedTime, now, false)

	if status == domain.PredictionStatusOverdue {
		confidence = nil
	}

	reasoning := formatFeedReasoning(medianInterval, len(filteredIntervals), confidence)

	return &domain.Prediction{
		FamilyID:       uuid.Nil, // Set by caller
		ActivityType:   domain.ActivityTypeFeed,
		PredictionType: domain.PredictionTypeNextFeed,
		PredictedTime:  predictedTime,
		Status:         status,
		Confidence:     confidence,
		Reasoning:      &reasoning,
	}
}

// generateFeedAmountPrediction returns the median feed amount in ml.
func generateFeedAmountPrediction(_ time.Time, feeds []FeedRecord, feedPred *domain.Prediction, loc *time.Location) *int {
	if feedPred == nil {
		return nil
	}

	// Filter to non-solid feeds with amounts
	var amounts []int
	predictedTOD := feedPred.PredictedTime.In(loc)
	predictedMinutes := predictedTOD.Hour()*60 + predictedTOD.Minute()

	for _, f := range feeds {
		if f.FeedType != nil && *f.FeedType == domain.FeedTypeSolids {
			continue
		}
		if f.AmountMl == nil || *f.AmountMl == 0 {
			continue
		}
		// Within +/- 2 hours of the predicted time-of-day
		feedTOD := f.StartTime.In(loc)
		feedMinutes := feedTOD.Hour()*60 + feedTOD.Minute()
		diff := abs(feedMinutes - predictedMinutes)
		if diff > 12*60 {
			diff = 24*60 - diff // wrap around midnight
		}
		if diff <= 120 {
			amounts = append(amounts, *f.AmountMl)
		}
	}

	if len(amounts) == 0 {
		// Fall back to all non-solid feeds with amounts
		for _, f := range feeds {
			if f.FeedType != nil && *f.FeedType == domain.FeedTypeSolids {
				continue
			}
			if f.AmountMl != nil && *f.AmountMl > 0 {
				amounts = append(amounts, *f.AmountMl)
			}
		}
	}

	if len(amounts) == 0 {
		return nil
	}

	median := medianInt(amounts)
	return &median
}

// generateSleepPredictions generates nap/wake predictions based on current sleep state.
func generateSleepPredictions(now time.Time, sleeps []SleepRecord, loc *time.Location) []*domain.Prediction {
	if len(sleeps) == 0 {
		return nil
	}

	naps, _ := classifySleeps(sleeps)
	if len(naps) == 0 {
		return nil
	}

	// Determine current state: is the baby currently sleeping?
	mostRecent := sleeps[0] // sleeps are ordered most recent first
	for i := 1; i < len(sleeps); i++ {
		if sleeps[i].StartTime.After(mostRecent.StartTime) {
			mostRecent = sleeps[i]
		}
	}

	currentlyAsleep := mostRecent.EndTime == nil
	isNap := classifySingleSleep(mostRecent) == "nap"

	if currentlyAsleep && isNap {
		// Baby is napping -> predict next wake
		return generateNextWakePrediction(now, naps, mostRecent, loc)
	}

	// Baby is awake -> predict next nap from wake windows
	return generateNextNapPrediction(now, naps, sleeps, loc)
}

func generateNextWakePrediction(now time.Time, naps []SleepRecord, currentNap SleepRecord, _ *time.Location) []*domain.Prediction {
	// Compute median nap duration from completed naps
	var durations []time.Duration
	for _, n := range naps {
		if n.EndTime != nil {
			d := n.EndTime.Sub(n.StartTime)
			durations = append(durations, d)
		}
	}

	if len(durations) == 0 {
		return nil
	}

	medianDur := medianDuration(durations)
	predictedTime := currentNap.StartTime.Add(medianDur)
	confidence := computeConfidence(len(durations), stddevDuration(durations), medianDur)
	status := assignStatus(predictedTime, now, false)

	if status == domain.PredictionStatusOverdue {
		confidence = nil
	}

	reasoning := fmt.Sprintf("Based on %.0fmin median nap duration from last %d naps", medianDur.Minutes(), len(durations))
	if confidence != nil && *confidence == domain.PredictionConfidenceLow {
		reasoning = fmt.Sprintf("Not enough data yet — only %d naps logged", len(durations))
	}

	durationMin := int(medianDur.Minutes())
	pred := &domain.Prediction{
		FamilyID:                 uuid.Nil,
		CareSessionID:            &currentNap.CareSessionID,
		ActivityType:             domain.ActivityTypeSleep,
		PredictionType:           domain.PredictionTypeNextWake,
		PredictedTime:            predictedTime,
		Status:                   status,
		Confidence:               confidence,
		Reasoning:                &reasoning,
		PredictedDurationMinutes: &durationMin,
	}

	return []*domain.Prediction{pred}
}

func generateNextNapPrediction(now time.Time, naps []SleepRecord, allSleeps []SleepRecord, _ *time.Location) []*domain.Prediction {
	// Compute wake windows: time between nap end and next nap start
	wakeWindows := computeWakeWindows(naps)
	filtered := filterWakeWindows(wakeWindows)
	if len(filtered) == 0 {
		return nil
	}

	medianWake := medianDuration(filtered)

	// Find last wake time (most recent nap end, or most recent overnight end)
	var lastWakeTime *time.Time
	for _, s := range allSleeps {
		if s.EndTime != nil {
			if lastWakeTime == nil || s.EndTime.After(*lastWakeTime) {
				lastWakeTime = s.EndTime
			}
		}
	}

	if lastWakeTime == nil {
		return nil
	}

	predictedTime := lastWakeTime.Add(medianWake)
	confidence := computeConfidence(len(filtered), stddevDuration(filtered), medianWake)
	status := assignStatus(predictedTime, now, false)

	if status == domain.PredictionStatusOverdue {
		confidence = nil
	}

	reasoning := fmt.Sprintf("Based on %.1fhr median wake window from last %d naps", medianWake.Hours(), len(filtered))
	if confidence != nil && *confidence == domain.PredictionConfidenceLow {
		reasoning = fmt.Sprintf("Not enough data yet — only %d wake windows logged", len(filtered))
	}

	// Estimate nap duration
	var napDurations []time.Duration
	for _, n := range naps {
		if n.EndTime != nil {
			napDurations = append(napDurations, n.EndTime.Sub(n.StartTime))
		}
	}
	var durationMin *int
	if len(napDurations) > 0 {
		d := int(medianDuration(napDurations).Minutes())
		durationMin = &d
	}

	pred := &domain.Prediction{
		FamilyID:                 uuid.Nil,
		ActivityType:             domain.ActivityTypeSleep,
		PredictionType:           domain.PredictionTypeNextNap,
		PredictedTime:            predictedTime,
		Status:                   status,
		Confidence:               confidence,
		Reasoning:                &reasoning,
		PredictedDurationMinutes: durationMin,
	}

	return []*domain.Prediction{pred}
}

// generateBedtimePrediction produces a bedtime prediction from overnight sleep start times.
func generateBedtimePrediction(now time.Time, sleeps []SleepRecord, loc *time.Location) *domain.Prediction {
	_, overnights := classifySleeps(sleeps)
	if len(overnights) < 2 {
		return nil
	}

	// Collect bedtime minutes-since-midnight for each overnight
	var bedtimeMinutes []int
	for _, o := range overnights {
		t := o.StartTime.In(loc)
		mins := t.Hour()*60 + t.Minute()
		// Normalize: if after midnight but before 6am, add 24*60
		if mins < daytimeStartHour*60 {
			mins += 24 * 60
		}
		bedtimeMinutes = append(bedtimeMinutes, mins)
	}

	medianMins := medianInt(bedtimeMinutes)
	// Convert back to today's date
	nowLocal := now.In(loc)
	todayStart := time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 0, 0, 0, 0, loc)
	predictedTime := todayStart.Add(time.Duration(medianMins) * time.Minute)

	// If predicted bedtime is already past and it's late, move to tomorrow
	if predictedTime.Before(now) {
		nowMinutes := nowLocal.Hour()*60 + nowLocal.Minute()
		if nowMinutes < daytimeStartHour*60 {
			nowMinutes += 24 * 60
		}
		if nowMinutes > medianMins {
			predictedTime = predictedTime.Add(24 * time.Hour)
		}
	}

	confidence := computeConfidence(len(bedtimeMinutes), stddevInt(bedtimeMinutes), time.Duration(medianMins)*time.Minute)
	status := assignStatus(predictedTime, now, false)

	if status == domain.PredictionStatusOverdue {
		confidence = nil
	}

	reasoning := fmt.Sprintf("Based on %s median bedtime from last %d nights",
		formatTimeOfDay(medianMins, loc), len(overnights))

	return &domain.Prediction{
		FamilyID:       uuid.Nil,
		ActivityType:   domain.ActivityTypeSleep,
		PredictionType: domain.PredictionTypeBedtime,
		PredictedTime:  predictedTime,
		Status:         status,
		Confidence:     confidence,
		Reasoning:      &reasoning,
	}
}

// chainPredictions fills in PLANNED predictions (alternating feeds/naps) until bedtime.
func chainPredictions(now time.Time, existing []*domain.Prediction, feeds []FeedRecord, sleeps []SleepRecord, loc *time.Location) []*domain.Prediction {
	result := make([]*domain.Prediction, len(existing))
	copy(result, existing)

	// Get median intervals needed for chaining
	daytimeFeeds := filterDaytimeFeeds(feeds, loc)
	intervals := filterFeedIntervals(computeFeedIntervals(daytimeFeeds))
	if len(intervals) == 0 {
		return result
	}
	medianFeedInterval := medianDuration(intervals)

	naps, _ := classifySleeps(sleeps)
	wakeWindows := filterWakeWindows(computeWakeWindows(naps))

	// Find bedtime cutoff
	var bedtimeCutoff time.Time
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeBedtime {
			bedtimeCutoff = p.PredictedTime
			break
		}
	}
	if bedtimeCutoff.IsZero() {
		// Default to 10pm today
		nowLocal := now.In(loc)
		bedtimeCutoff = time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), daytimeEndHour, 0, 0, 0, loc)
		if bedtimeCutoff.Before(now) {
			return result // Past bedtime, no chaining needed
		}
	}

	// Find the latest existing prediction time to chain from
	var lastFeedTime time.Time
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed && p.PredictedTime.After(lastFeedTime) {
			lastFeedTime = p.PredictedTime
		}
	}

	if lastFeedTime.IsZero() {
		return result
	}

	// Chain additional feed predictions
	chainTime := lastFeedTime.Add(medianFeedInterval)
	for chainTime.Before(bedtimeCutoff) && len(result) < maxPredictions {
		confidence := computeConfidence(len(intervals), stddevDuration(intervals), medianFeedInterval)
		reasoning := fmt.Sprintf("Chained: based on %.1fhr median feed interval", medianFeedInterval.Hours())
		pred := &domain.Prediction{
			FamilyID:       uuid.Nil,
			ActivityType:   domain.ActivityTypeFeed,
			PredictionType: domain.PredictionTypeNextFeed,
			PredictedTime:  chainTime,
			Status:         domain.PredictionStatusPlanned,
			Confidence:     confidence,
			Reasoning:      &reasoning,
		}
		result = append(result, pred)
		chainTime = chainTime.Add(medianFeedInterval)
	}

	// Chain nap predictions if we have wake window data
	if len(wakeWindows) > 0 {
		medianWakeWindow := medianDuration(wakeWindows)
		var napDurations []time.Duration
		for _, n := range naps {
			if n.EndTime != nil {
				napDurations = append(napDurations, n.EndTime.Sub(n.StartTime))
			}
		}

		if len(napDurations) > 0 {
			medianNapDur := medianDuration(napDurations)

			// Find the last wake time or nap end prediction
			var lastWake time.Time
			for _, p := range existing {
				if p.PredictionType == domain.PredictionTypeNextWake && p.PredictedTime.After(lastWake) {
					lastWake = p.PredictedTime
				}
				if p.PredictionType == domain.PredictionTypeNextNap && p.PredictedTime.After(lastWake) {
					// A nap prediction means baby will wake after nap duration
					lastWake = p.PredictedTime.Add(medianNapDur)
				}
			}

			if !lastWake.IsZero() {
				napTime := lastWake.Add(medianWakeWindow)
				for napTime.Before(bedtimeCutoff) && len(result) < maxPredictions {
					confidence := computeConfidence(len(wakeWindows), stddevDuration(wakeWindows), medianWakeWindow)
					reasoning := fmt.Sprintf("Chained: based on %.1fhr median wake window", medianWakeWindow.Hours())
					durationMin := int(medianNapDur.Minutes())
					pred := &domain.Prediction{
						FamilyID:                 uuid.Nil,
						ActivityType:             domain.ActivityTypeSleep,
						PredictionType:           domain.PredictionTypeNextNap,
						PredictedTime:            napTime,
						Status:                   domain.PredictionStatusPlanned,
						Confidence:               confidence,
						Reasoning:                &reasoning,
						PredictedDurationMinutes: &durationMin,
					}
					result = append(result, pred)

					// Next nap starts after this nap ends + wake window
					napTime = napTime.Add(medianNapDur).Add(medianWakeWindow)
				}
			}
		}
	}

	// Sort by predicted time
	sort.Slice(result, func(i, j int) bool {
		return result[i].PredictedTime.Before(result[j].PredictedTime)
	})

	if len(result) > maxPredictions {
		result = result[:maxPredictions]
	}

	return result
}

// --- Helper functions ---

func filterDaytimeFeeds(feeds []FeedRecord, loc *time.Location) []FeedRecord {
	var result []FeedRecord
	for _, f := range feeds {
		// Exclude solids
		if f.FeedType != nil && *f.FeedType == domain.FeedTypeSolids {
			continue
		}
		// Exclude nighttime feeds
		hour := f.StartTime.In(loc).Hour()
		if hour < daytimeStartHour || hour >= daytimeEndHour {
			continue
		}
		result = append(result, f)
	}
	return result
}

func computeFeedIntervals(feeds []FeedRecord) []time.Duration {
	if len(feeds) < 2 {
		return nil
	}

	// Sort by start time ascending
	sorted := make([]FeedRecord, len(feeds))
	copy(sorted, feeds)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].StartTime.Before(sorted[j].StartTime)
	})

	var intervals []time.Duration
	for i := 1; i < len(sorted); i++ {
		interval := sorted[i].StartTime.Sub(sorted[i-1].StartTime)
		intervals = append(intervals, interval)
	}
	return intervals
}

func filterFeedIntervals(intervals []time.Duration) []time.Duration {
	var result []time.Duration
	for _, i := range intervals {
		if i >= minFeedInterval && i <= maxFeedInterval {
			result = append(result, i)
		}
	}
	return result
}

func computeWakeWindows(naps []SleepRecord) []time.Duration {
	if len(naps) < 2 {
		return nil
	}

	// Sort by start time ascending
	sorted := make([]SleepRecord, len(naps))
	copy(sorted, naps)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].StartTime.Before(sorted[j].StartTime)
	})

	var windows []time.Duration
	for i := 1; i < len(sorted); i++ {
		if sorted[i-1].EndTime != nil {
			window := sorted[i].StartTime.Sub(*sorted[i-1].EndTime)
			windows = append(windows, window)
		}
	}
	return windows
}

func filterWakeWindows(windows []time.Duration) []time.Duration {
	var result []time.Duration
	for _, w := range windows {
		if w >= minWakeWindow && w <= maxWakeWindow {
			result = append(result, w)
		}
	}
	return result
}

func classifySleeps(sleeps []SleepRecord) (naps []SleepRecord, overnights []SleepRecord) {
	for _, s := range sleeps {
		if classifySingleSleep(s) == "nap" {
			naps = append(naps, s)
		} else {
			overnights = append(overnights, s)
		}
	}
	return
}

func classifySingleSleep(s SleepRecord) string {
	var durationMin float64
	if s.DurationMinutes != nil {
		durationMin = float64(*s.DurationMinutes)
	} else if s.EndTime != nil {
		durationMin = s.EndTime.Sub(s.StartTime).Minutes()
	} else {
		// Ongoing sleep: use time since start as heuristic
		// If started more than napMaxMinutes ago, treat as overnight
		return "nap" // Default ongoing to nap; caller should check
	}

	if durationMin < napMaxMinutes {
		return "nap"
	}
	return "overnight"
}

func findLastFeed(feeds []FeedRecord) *FeedRecord {
	if len(feeds) == 0 {
		return nil
	}
	last := feeds[0]
	for _, f := range feeds[1:] {
		if f.StartTime.After(last.StartTime) {
			last = f
		}
	}
	return &last
}

func medianDuration(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	sorted := make([]time.Duration, len(durations))
	copy(sorted, durations)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })

	n := len(sorted)
	if n%2 == 1 {
		return sorted[n/2]
	}
	return (sorted[n/2-1] + sorted[n/2]) / 2
}

func medianInt(values []int) int {
	if len(values) == 0 {
		return 0
	}
	sorted := make([]int, len(values))
	copy(sorted, values)
	sort.Ints(sorted)

	n := len(sorted)
	if n%2 == 1 {
		return sorted[n/2]
	}
	return (sorted[n/2-1] + sorted[n/2]) / 2
}

func stddevDuration(durations []time.Duration) time.Duration {
	if len(durations) < 2 {
		return 0
	}
	var sum float64
	for _, d := range durations {
		sum += float64(d)
	}
	mean := sum / float64(len(durations))

	var variance float64
	for _, d := range durations {
		diff := float64(d) - mean
		variance += diff * diff
	}
	variance /= float64(len(durations))
	return time.Duration(math.Sqrt(variance))
}

func stddevInt(values []int) time.Duration {
	if len(values) < 2 {
		return 0
	}
	var sum float64
	for _, v := range values {
		sum += float64(v)
	}
	mean := sum / float64(len(values))

	var variance float64
	for _, v := range values {
		diff := float64(v) - mean
		variance += diff * diff
	}
	variance /= float64(len(values))
	return time.Duration(math.Sqrt(variance)) * time.Minute
}

func computeConfidence(dataPointCount int, stddev, median time.Duration) *domain.PredictionConfidence {
	score := 100

	if dataPointCount < 5 {
		score -= 30
	} else if dataPointCount < 10 {
		score -= 15
	}

	// High variance penalty
	if median > 0 && float64(stddev) > 0.25*float64(median) {
		score -= 25
	}

	var c domain.PredictionConfidence
	switch {
	case score >= 75:
		c = domain.PredictionConfidenceHigh
	case score >= 50:
		c = domain.PredictionConfidenceMedium
	default:
		c = domain.PredictionConfidenceLow
	}
	return &c
}

func assignStatus(predictedTime, now time.Time, isChained bool) domain.PredictionStatus {
	if isChained {
		return domain.PredictionStatusPlanned
	}
	if predictedTime.Before(now) {
		return domain.PredictionStatusOverdue
	}
	return domain.PredictionStatusUpcoming
}

func formatFeedReasoning(medianInterval time.Duration, dataPoints int, confidence *domain.PredictionConfidence) string {
	if confidence != nil && *confidence == domain.PredictionConfidenceLow {
		return fmt.Sprintf("Not enough data yet — only %d feed intervals logged", dataPoints)
	}
	return fmt.Sprintf("Based on %.1fhr median feed interval from last %d feeds", medianInterval.Hours(), dataPoints)
}

func formatTimeOfDay(minutes int, loc *time.Location) string {
	h := minutes / 60
	m := minutes % 60
	if h >= 24 {
		h -= 24
	}
	t := time.Date(2000, 1, 1, h, m, 0, 0, loc)
	return t.Format("3:04pm")
}

func stableID(predType domain.PredictionType, predictedTime time.Time) uuid.UUID {
	data := fmt.Sprintf("%s:%s", predType, predictedTime.UTC().Format(time.RFC3339))
	hash := sha256.Sum256([]byte(data))
	id, _ := uuid.FromBytes(hash[:16])
	return id
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
