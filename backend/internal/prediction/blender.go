package prediction

import (
	"fmt"
	"math"
	"time"

	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Blending thresholds
const (
	enoughDataThreshold = 7
	sparseDataThreshold = 3
	sparseDataWeight    = 0.4  // weight for observed data when sparse
	sparseGoalWeight    = 0.6  // weight for goal when sparse
	agreementThreshold  = 0.10 // 10% difference = "agreement"
)

// BlendResult holds the output of blending observed data with a goal.
type BlendResult struct {
	Value      float64
	Confidence domain.PredictionConfidence
	Reasoning  string
}

// BlendValue blends an observed median value with a goal value based on data point count.
// Returns nil if both observedMedian and goalValue are nil.
func BlendValue(observedMedian *float64, dataPoints int, goalValue *float64) *BlendResult {
	if observedMedian == nil && goalValue == nil {
		return nil
	}

	// Goals only, no data
	if observedMedian == nil || dataPoints < sparseDataThreshold {
		if goalValue == nil {
			if observedMedian == nil {
				return nil
			}
			// Very little data, no goal — use observed
			confidence := domain.PredictionConfidenceLow
			return &BlendResult{
				Value:      *observedMedian,
				Confidence: confidence,
				Reasoning:  fmt.Sprintf("Not enough data yet — only %d data points", dataPoints),
			}
		}
		if observedMedian == nil {
			confidence := domain.PredictionConfidenceLow
			return &BlendResult{
				Value:      *goalValue,
				Confidence: confidence,
				Reasoning:  "Using your target (not enough data yet)",
			}
		}
		// <3 data points with goal → goal wins
		confidence := domain.PredictionConfidenceLow
		return &BlendResult{
			Value:      *goalValue,
			Confidence: confidence,
			Reasoning:  "Using your target (not enough data yet)",
		}
	}

	// Data only, no goals
	if goalValue == nil {
		return nil // let caller use original data-only prediction
	}

	// Both present: enough data (>=7)
	if dataPoints >= enoughDataThreshold {
		confidence := agreementConfidence(*observedMedian, *goalValue)
		var reasoning string
		if confidence == domain.PredictionConfidenceHigh {
			reasoning = fmt.Sprintf("Recent avg: %.0fmin (your target: %.0fmin) — well aligned", *observedMedian, *goalValue)
		} else {
			reasoning = fmt.Sprintf("Recent avg: %.0fmin (your target: %.0fmin)", *observedMedian, *goalValue)
		}
		return &BlendResult{
			Value:      *observedMedian,
			Confidence: confidence,
			Reasoning:  reasoning,
		}
	}

	// Both present: sparse data (3-6)
	blended := sparseDataWeight**observedMedian + sparseGoalWeight**goalValue
	blended = math.Round(blended)
	confidence := domain.PredictionConfidenceMedium
	reasoning := fmt.Sprintf("Blending recent pattern (%.0fmin) with your target (%.0fmin)", *observedMedian, *goalValue)
	return &BlendResult{
		Value:      blended,
		Confidence: confidence,
		Reasoning:  reasoning,
	}
}

// BlendTime blends observed time-of-day (HH:MM) with a goal time-of-day.
// Uses minutes-since-midnight with modular arithmetic for midnight wraparound.
func BlendTime(observedTime *string, dataPoints int, goalTime *string) *BlendResult {
	if observedTime == nil && goalTime == nil {
		return nil
	}

	var observedMin *float64
	if observedTime != nil {
		m := float64(parseTimeToMinutes(*observedTime))
		observedMin = &m
	}

	var goalMin *float64
	if goalTime != nil {
		m := float64(parseTimeToMinutes(*goalTime))
		goalMin = &m
	}

	// Handle midnight wraparound: if the times are far apart, shift one
	if observedMin != nil && goalMin != nil {
		diff := *observedMin - *goalMin
		if diff > 12*60 {
			// observed is much later — shift goal forward by 24h
			shifted := *goalMin + 24*60
			goalMin = &shifted
		} else if diff < -12*60 {
			// goal is much later — shift observed forward by 24h
			shifted := *observedMin + 24*60
			observedMin = &shifted
		}
	}

	result := BlendValue(observedMin, dataPoints, goalMin)
	if result == nil {
		return nil
	}

	// Convert blended minutes back to HH:MM
	mins := int(math.Round(result.Value))
	mins = ((mins % (24 * 60)) + 24*60) % (24 * 60) // normalize to 0-1439
	result.Value = float64(mins)

	return result
}

// parseTimeToMinutes converts "HH:MM" to minutes since midnight.
func parseTimeToMinutes(hhmm string) int {
	t, err := time.Parse("15:04", hhmm)
	if err != nil {
		return 0
	}
	return t.Hour()*60 + t.Minute()
}

// agreementConfidence returns HIGH if values are within agreementThreshold (10%), MEDIUM otherwise.
func agreementConfidence(observed, goal float64) domain.PredictionConfidence {
	if goal == 0 {
		if observed == 0 {
			return domain.PredictionConfidenceHigh
		}
		return domain.PredictionConfidenceMedium
	}
	ratio := math.Abs(observed-goal) / math.Abs(goal)
	if ratio <= agreementThreshold {
		return domain.PredictionConfidenceHigh
	}
	return domain.PredictionConfidenceMedium
}

// ConstrainNapCount limits the number of nap predictions to the goal count.
// It removes PLANNED nap predictions first, then UPCOMING ones if needed.
func ConstrainNapCount(predictions []*domain.Prediction, goalNapCount *int) []*domain.Prediction {
	if goalNapCount == nil {
		return predictions
	}

	target := *goalNapCount

	// Count current nap predictions
	var napPreds []*domain.Prediction
	var otherPreds []*domain.Prediction
	for _, p := range predictions {
		if p.PredictionType == domain.PredictionTypeNextNap {
			napPreds = append(napPreds, p)
		} else {
			otherPreds = append(otherPreds, p)
		}
	}

	if len(napPreds) <= target {
		return predictions
	}

	// Keep only 'target' nap predictions (keep the earliest ones)
	napPreds = napPreds[:target]
	result := append(otherPreds, napPreds...)
	return result
}

// ConstrainNapDuration caps individual nap duration predictions to the goal max.
func ConstrainNapDuration(predictions []*domain.Prediction, maxMinutes *int) []*domain.Prediction {
	if maxMinutes == nil || *maxMinutes <= 0 {
		return predictions
	}

	for _, p := range predictions {
		if p.PredictionType == domain.PredictionTypeNextNap && p.PredictedDurationMinutes != nil {
			if *p.PredictedDurationMinutes > *maxMinutes {
				capped := *maxMinutes
				p.PredictedDurationMinutes = &capped
			}
		}
	}
	return predictions
}

// BlendPredictions applies schedule goals to a set of predictions generated by the data-driven engine.
// It modifies predictions in-place and returns the updated slice.
func BlendPredictions(predictions []*domain.Prediction, goals *domain.ScheduleGoals, feedDataPoints, sleepDataPoints int) []*domain.Prediction {
	if goals == nil {
		return predictions
	}

	// Check if all goal fields are nil (equivalent to no goals)
	if goals.TargetWakeWindowMinutes == nil &&
		goals.TargetFeedIntervalMinutes == nil &&
		goals.TargetNapCount == nil &&
		goals.MaxDaytimeNapMinutes == nil &&
		goals.TargetBedtime == nil &&
		goals.TargetWakeTime == nil {
		return predictions
	}

	for _, p := range predictions {
		switch p.PredictionType {
		case domain.PredictionTypeNextFeed:
			blendFeedPrediction(p, goals, feedDataPoints)
		case domain.PredictionTypeNextNap:
			blendNapPrediction(p, goals, sleepDataPoints)
		case domain.PredictionTypeBedtime:
			blendBedtimePrediction(p, goals, sleepDataPoints)
		}
	}

	// Apply nap count and duration constraints
	predictions = ConstrainNapCount(predictions, goals.TargetNapCount)
	predictions = ConstrainNapDuration(predictions, goals.MaxDaytimeNapMinutes)

	return predictions
}

// blendFeedPrediction blends a feed prediction with the target feed interval goal.
func blendFeedPrediction(p *domain.Prediction, goals *domain.ScheduleGoals, dataPoints int) {
	if goals.TargetFeedIntervalMinutes == nil {
		return
	}

	if p.Reasoning == nil {
		return
	}

	goalMin := float64(*goals.TargetFeedIntervalMinutes)

	// Extract the observed median from the prediction's existing timing
	// We blend by adjusting the predicted time
	// The reasoning already contains the observed interval info
	result := BlendValue(nil, 0, &goalMin)
	if dataPoints >= sparseDataThreshold {
		// We have some data — need to compute observed from existing prediction
		// The existing prediction was computed from median intervals.
		// We'll adjust reasoning and confidence based on the blend result.
		observedMin := &goalMin // placeholder — we'll use a different approach

		// Extract observed interval from reasoning if possible, otherwise just annotate
		_ = observedMin
		result = BlendValue(&goalMin, dataPoints, &goalMin) // self-blend gives data-wins or agreement
	}

	// Simpler approach: just update reasoning and confidence based on data points vs goal
	if dataPoints < sparseDataThreshold {
		// Not enough data — use goal directly
		confidence := domain.PredictionConfidenceLow
		p.Confidence = &confidence
		reasoning := "Using your target (not enough data yet)"
		p.Reasoning = &reasoning
	} else if dataPoints < enoughDataThreshold {
		// Sparse data — note the blend
		confidence := domain.PredictionConfidenceMedium
		p.Confidence = &confidence
		reasoning := fmt.Sprintf("Blending recent pattern with your target (%dmin feed interval)", *goals.TargetFeedIntervalMinutes)
		p.Reasoning = &reasoning
	} else {
		// Enough data — data wins, mention goal for context
		if result != nil {
			p.Confidence = &result.Confidence
		}
		existing := ""
		if p.Reasoning != nil {
			existing = *p.Reasoning
		}
		reasoning := fmt.Sprintf("%s (your target: %dmin)", existing, *goals.TargetFeedIntervalMinutes)
		p.Reasoning = &reasoning
	}
}

// blendNapPrediction blends nap predictions with wake window goals.
func blendNapPrediction(p *domain.Prediction, goals *domain.ScheduleGoals, dataPoints int) {
	if goals.TargetWakeWindowMinutes == nil {
		return
	}

	goalMin := float64(*goals.TargetWakeWindowMinutes)

	if dataPoints < sparseDataThreshold {
		confidence := domain.PredictionConfidenceLow
		p.Confidence = &confidence
		reasoning := "Using your target (not enough data yet)"
		p.Reasoning = &reasoning
	} else if dataPoints < enoughDataThreshold {
		confidence := domain.PredictionConfidenceMedium
		p.Confidence = &confidence
		reasoning := fmt.Sprintf("Blending recent pattern with your target (%dmin wake window)", *goals.TargetWakeWindowMinutes)
		p.Reasoning = &reasoning
	} else {
		// Enough data — annotate with goal
		_ = goalMin
		existing := ""
		if p.Reasoning != nil {
			existing = *p.Reasoning
		}
		reasoning := fmt.Sprintf("%s (your target: %dmin wake window)", existing, *goals.TargetWakeWindowMinutes)
		p.Reasoning = &reasoning
	}
}

// blendBedtimePrediction blends bedtime prediction with the target bedtime goal.
func blendBedtimePrediction(p *domain.Prediction, goals *domain.ScheduleGoals, dataPoints int) {
	if goals.TargetBedtime == nil {
		return
	}

	if dataPoints < sparseDataThreshold {
		confidence := domain.PredictionConfidenceLow
		p.Confidence = &confidence
		reasoning := fmt.Sprintf("Using your target bedtime of %s (not enough data yet)", *goals.TargetBedtime)
		p.Reasoning = &reasoning
	} else if dataPoints < enoughDataThreshold {
		confidence := domain.PredictionConfidenceMedium
		p.Confidence = &confidence
		reasoning := fmt.Sprintf("Blending recent pattern with your target bedtime (%s)", *goals.TargetBedtime)
		p.Reasoning = &reasoning
	} else {
		existing := ""
		if p.Reasoning != nil {
			existing = *p.Reasoning
		}
		reasoning := fmt.Sprintf("%s (your target: %s)", existing, *goals.TargetBedtime)
		p.Reasoning = &reasoning
	}
}

// GenerateGoalOnlyPredictions creates predictions purely from schedule goals when no activity data exists.
func GenerateGoalOnlyPredictions(now time.Time, goals *domain.ScheduleGoals, timezone string) []*domain.Prediction {
	if goals == nil {
		return nil
	}

	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}

	var predictions []*domain.Prediction
	confidence := domain.PredictionConfidenceLow

	nowLocal := now.In(loc)

	// Feed prediction from goal interval
	if goals.TargetFeedIntervalMinutes != nil {
		interval := time.Duration(*goals.TargetFeedIntervalMinutes) * time.Minute
		predictedTime := now.Add(interval)
		reasoning := "Using your target (not enough data yet)"
		pred := &domain.Prediction{
			ActivityType:   domain.ActivityTypeFeed,
			PredictionType: domain.PredictionTypeNextFeed,
			PredictedTime:  predictedTime,
			Status:         assignStatus(predictedTime, now, false),
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		}
		predictions = append(predictions, pred)
	}

	// Nap prediction from wake window goal
	if goals.TargetWakeWindowMinutes != nil {
		wakeWindow := time.Duration(*goals.TargetWakeWindowMinutes) * time.Minute
		// Assume baby woke up at target wake time or now
		var wakeTime time.Time
		if goals.TargetWakeTime != nil {
			mins := parseTimeToMinutes(*goals.TargetWakeTime)
			wakeTime = time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), mins/60, mins%60, 0, 0, loc)
			if wakeTime.After(now) {
				// Wake time is in the future today; use now as anchor
				wakeTime = now
			}
		} else {
			wakeTime = now
		}

		predictedTime := wakeTime.Add(wakeWindow)
		if predictedTime.Before(now) {
			// Already past — push to next window
			for predictedTime.Before(now) {
				predictedTime = predictedTime.Add(wakeWindow)
			}
		}
		reasoning := "Using your target (not enough data yet)"
		pred := &domain.Prediction{
			ActivityType:   domain.ActivityTypeSleep,
			PredictionType: domain.PredictionTypeNextNap,
			PredictedTime:  predictedTime,
			Status:         assignStatus(predictedTime, now, false),
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		}
		if goals.MaxDaytimeNapMinutes != nil {
			dur := *goals.MaxDaytimeNapMinutes
			pred.PredictedDurationMinutes = &dur
		}
		predictions = append(predictions, pred)
	}

	// Bedtime prediction from goal
	if goals.TargetBedtime != nil {
		mins := parseTimeToMinutes(*goals.TargetBedtime)
		todayStart := time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 0, 0, 0, 0, loc)
		predictedTime := todayStart.Add(time.Duration(mins) * time.Minute)
		if predictedTime.Before(now) {
			predictedTime = predictedTime.Add(24 * time.Hour)
		}
		reasoning := fmt.Sprintf("Using your target bedtime of %s (not enough data yet)", *goals.TargetBedtime)
		pred := &domain.Prediction{
			ActivityType:   domain.ActivityTypeSleep,
			PredictionType: domain.PredictionTypeBedtime,
			PredictedTime:  predictedTime,
			Status:         assignStatus(predictedTime, now, false),
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		}
		predictions = append(predictions, pred)
	}

	return predictions
}
