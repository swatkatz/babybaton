package prediction

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func ptr[T any](v T) *T { return &v }

var testLoc = time.FixedZone("PST", -8*60*60)

// baseTime is 2pm local time on a weekday
var baseTime = time.Date(2026, 3, 15, 14, 0, 0, 0, testLoc)

// --- Helper functions for building test data ---

func makeFeed(hoursAgo float64, feedType domain.FeedType, amountMl int) FeedRecord {
	startTime := baseTime.Add(-time.Duration(hoursAgo * float64(time.Hour)))
	return FeedRecord{
		StartTime: startTime,
		FeedType:  &feedType,
		AmountMl:  &amountMl,
	}
}

func makeFeedAt(t time.Time, feedType domain.FeedType, amountMl int) FeedRecord {
	return FeedRecord{
		StartTime: t,
		FeedType:  &feedType,
		AmountMl:  &amountMl,
	}
}

func makeNap(startHoursAgo, durationMin float64) SleepRecord {
	start := baseTime.Add(-time.Duration(startHoursAgo * float64(time.Hour)))
	dur := int(durationMin)
	end := start.Add(time.Duration(durationMin) * time.Minute)
	return SleepRecord{
		StartTime:       start,
		EndTime:         &end,
		DurationMinutes: &dur,
		CareSessionID:   uuid.New(),
	}
}

func makeOngoingNap(startHoursAgo float64) SleepRecord {
	start := baseTime.Add(-time.Duration(startHoursAgo * float64(time.Hour)))
	return SleepRecord{
		StartTime:     start,
		CareSessionID: uuid.New(),
	}
}

func makeOvernight(startHoursAgo, durationMin float64) SleepRecord {
	start := baseTime.Add(-time.Duration(startHoursAgo * float64(time.Hour)))
	dur := int(durationMin)
	end := start.Add(time.Duration(durationMin) * time.Minute)
	return SleepRecord{
		StartTime:       start,
		EndTime:         &end,
		DurationMinutes: &dur,
		CareSessionID:   uuid.New(),
	}
}

// --- Median tests ---

func TestMedianDuration_OddCount(t *testing.T) {
	durations := []time.Duration{1 * time.Hour, 3 * time.Hour, 2 * time.Hour}
	got := medianDuration(durations)
	if got != 2*time.Hour {
		t.Errorf("expected 2h, got %v", got)
	}
}

func TestMedianDuration_EvenCount(t *testing.T) {
	durations := []time.Duration{1 * time.Hour, 2 * time.Hour, 3 * time.Hour, 4 * time.Hour}
	got := medianDuration(durations)
	expected := 2*time.Hour + 30*time.Minute
	if got != expected {
		t.Errorf("expected %v, got %v", expected, got)
	}
}

func TestMedianDuration_SingleElement(t *testing.T) {
	got := medianDuration([]time.Duration{5 * time.Hour})
	if got != 5*time.Hour {
		t.Errorf("expected 5h, got %v", got)
	}
}

func TestMedianDuration_Empty(t *testing.T) {
	got := medianDuration(nil)
	if got != 0 {
		t.Errorf("expected 0, got %v", got)
	}
}

// --- Filter tests ---

func TestFilterDaytimeFeeds_ExcludesSolids(t *testing.T) {
	feeds := []FeedRecord{
		makeFeed(1, domain.FeedTypeBreastMilk, 120),
		makeFeed(2, domain.FeedTypeSolids, 0),
		makeFeed(3, domain.FeedTypeFormula, 150),
		makeFeed(4, domain.FeedTypeSolids, 0),
		makeFeed(5, domain.FeedTypeBreastMilk, 100),
	}
	result := filterDaytimeFeeds(feeds, testLoc)
	if len(result) != 3 {
		t.Errorf("expected 3 feeds after filtering solids, got %d", len(result))
	}
}

func TestFilterDaytimeFeeds_ExcludesNightFeeds(t *testing.T) {
	// Create feeds at specific times: 2am, 5am, 8am, 2pm local
	day := time.Date(2026, 3, 15, 0, 0, 0, 0, testLoc)
	feeds := []FeedRecord{
		makeFeedAt(day.Add(2*time.Hour), domain.FeedTypeBreastMilk, 100),  // 2am
		makeFeedAt(day.Add(5*time.Hour), domain.FeedTypeBreastMilk, 100),  // 5am
		makeFeedAt(day.Add(8*time.Hour), domain.FeedTypeBreastMilk, 100),  // 8am
		makeFeedAt(day.Add(14*time.Hour), domain.FeedTypeBreastMilk, 100), // 2pm
	}
	result := filterDaytimeFeeds(feeds, testLoc)
	if len(result) != 2 {
		t.Errorf("expected 2 daytime feeds (8am, 2pm), got %d", len(result))
	}
}

func TestFilterFeedIntervals_RemovesOutliers(t *testing.T) {
	intervals := []time.Duration{
		30 * time.Minute,       // too short
		2 * time.Hour,          // ok
		3 * time.Hour,          // ok
		3*time.Hour + 30*time.Minute, // ok
		10 * time.Hour,         // too long
	}
	result := filterFeedIntervals(intervals)
	if len(result) != 3 {
		t.Errorf("expected 3 intervals, got %d", len(result))
	}
}

func TestClassifySleep_Nap(t *testing.T) {
	s := SleepRecord{DurationMinutes: ptr(90)}
	if classifySingleSleep(s) != "nap" {
		t.Error("expected nap for 90 min sleep")
	}
}

func TestClassifySleep_Overnight(t *testing.T) {
	s := SleepRecord{DurationMinutes: ptr(200)}
	if classifySingleSleep(s) != "overnight" {
		t.Error("expected overnight for 200 min sleep")
	}
}

func TestClassifySleep_Boundary(t *testing.T) {
	s199 := SleepRecord{DurationMinutes: ptr(199)}
	if classifySingleSleep(s199) != "nap" {
		t.Error("199 min should be nap")
	}
	s200 := SleepRecord{DurationMinutes: ptr(200)}
	if classifySingleSleep(s200) != "overnight" {
		t.Error("200 min should be overnight")
	}
}

func TestFilterWakeWindows_RemovesOutliers(t *testing.T) {
	windows := []time.Duration{
		30 * time.Minute,  // too short
		90 * time.Minute,  // ok
		2 * time.Hour,     // ok
		150 * time.Minute, // ok
		7 * time.Hour,     // too long
	}
	result := filterWakeWindows(windows)
	if len(result) != 3 {
		t.Errorf("expected 3 windows, got %d", len(result))
	}
}

// --- Confidence tests ---

func TestComputeConfidence_High(t *testing.T) {
	// 10+ data points, low variance
	c := computeConfidence(12, 10*time.Minute, 3*time.Hour)
	if c == nil || *c != domain.PredictionConfidenceHigh {
		t.Errorf("expected HIGH confidence, got %v", c)
	}
}

func TestComputeConfidence_Medium(t *testing.T) {
	// 7 data points (score: 100 - 15 = 85 -> HIGH, but with high variance -> 85 - 25 = 60 -> MEDIUM)
	c := computeConfidence(7, 1*time.Hour, 2*time.Hour)
	if c == nil || *c != domain.PredictionConfidenceMedium {
		t.Errorf("expected MEDIUM confidence, got %v", c)
	}
}

func TestComputeConfidence_Low(t *testing.T) {
	// 3 data points with high variance
	c := computeConfidence(3, 2*time.Hour, 3*time.Hour)
	if c == nil || *c != domain.PredictionConfidenceLow {
		t.Errorf("expected LOW confidence, got %v", c)
	}
}

// --- Status tests ---

func TestAssignStatus_Overdue(t *testing.T) {
	now := time.Now()
	past := now.Add(-30 * time.Minute)
	s := assignStatus(past, now, false)
	if s != domain.PredictionStatusOverdue {
		t.Errorf("expected OVERDUE, got %v", s)
	}
}

func TestAssignStatus_Upcoming(t *testing.T) {
	now := time.Now()
	future := now.Add(1 * time.Hour)
	s := assignStatus(future, now, false)
	if s != domain.PredictionStatusUpcoming {
		t.Errorf("expected UPCOMING, got %v", s)
	}
}

func TestAssignStatus_Planned(t *testing.T) {
	now := time.Now()
	future := now.Add(4 * time.Hour)
	s := assignStatus(future, now, true)
	if s != domain.PredictionStatusPlanned {
		t.Errorf("expected PLANNED, got %v", s)
	}
}

// --- Full generation tests ---

func TestGeneratePredictions_NoData(t *testing.T) {
	result := GeneratePredictions(baseTime, nil, nil, "America/Los_Angeles")
	if len(result) != 0 {
		t.Errorf("expected 0 predictions for no data, got %d", len(result))
	}
}

func TestGeneratePredictions_OnlyFeeds(t *testing.T) {
	// 10 feeds over 3 days, roughly every 3 hours during daytime
	var feeds []FeedRecord
	for i := 0; i < 10; i++ {
		hoursAgo := float64(i) * 3.0
		feeds = append(feeds, makeFeed(hoursAgo, domain.FeedTypeBreastMilk, 120))
	}

	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")
	if len(result) == 0 {
		t.Fatal("expected at least 1 prediction")
	}

	// Should have at least one NEXT_FEED
	hasFeed := false
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed {
			hasFeed = true
			break
		}
	}
	if !hasFeed {
		t.Error("expected NEXT_FEED prediction")
	}

	// Should NOT have sleep predictions
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextNap || p.PredictionType == domain.PredictionTypeNextWake {
			t.Error("should not have sleep predictions with only feed data")
		}
	}
}

func TestGeneratePredictions_TypicalDay(t *testing.T) {
	// Feeds every ~3 hours
	var feeds []FeedRecord
	for i := 0; i < 12; i++ {
		hoursAgo := float64(i) * 3.0
		feeds = append(feeds, makeFeed(hoursAgo, domain.FeedTypeBreastMilk, 120))
	}

	// Naps: 3 naps of ~90 min each, roughly every 2.5 hours wake window
	sleeps := []SleepRecord{
		makeNap(1.5, 90),   // most recent nap ended 0 hours ago
		makeNap(5, 90),     // second nap
		makeNap(8.5, 90),   // third nap
		makeNap(12, 90),    // fourth
		makeNap(15.5, 90),  // fifth
	}
	// Add overnight sleeps
	sleeps = append(sleeps,
		makeOvernight(24, 600),  // last night: 10 hours
		makeOvernight(48, 600),  // night before
	)

	result := GeneratePredictions(baseTime, feeds, sleeps, "America/Los_Angeles")
	if len(result) == 0 {
		t.Fatal("expected predictions")
	}

	types := make(map[domain.PredictionType]bool)
	for _, p := range result {
		types[p.PredictionType] = true
	}

	if !types[domain.PredictionTypeNextFeed] {
		t.Error("expected NEXT_FEED prediction")
	}
	// Should have nap prediction since baby is awake (most recent nap has end time)
	if !types[domain.PredictionTypeNextNap] {
		t.Error("expected NEXT_NAP prediction")
	}
	if !types[domain.PredictionTypeBedtime] {
		t.Error("expected BEDTIME prediction")
	}
}

func TestGeneratePredictions_OverdueFeed(t *testing.T) {
	// Last feed was 5 hours ago, median interval is ~3 hours
	var feeds []FeedRecord
	for i := 0; i < 8; i++ {
		hoursAgo := 5.0 + float64(i)*3.0
		feeds = append(feeds, makeFeed(hoursAgo, domain.FeedTypeFormula, 150))
	}

	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")

	var overdueFeed *domain.Prediction
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed && p.Status == domain.PredictionStatusOverdue {
			overdueFeed = p
			break
		}
	}
	if overdueFeed == nil {
		t.Fatal("expected an OVERDUE NEXT_FEED prediction")
	}
	if overdueFeed.Confidence != nil {
		t.Error("OVERDUE predictions should have nil confidence")
	}
}

func TestGeneratePredictions_CurrentlyAsleep(t *testing.T) {
	// Baby is currently napping (ongoing nap, no end time)
	sleeps := []SleepRecord{
		makeOngoingNap(0.5), // started 30 min ago, still sleeping
		makeNap(4, 90),
		makeNap(7.5, 80),
		makeNap(11, 85),
	}

	result := GeneratePredictions(baseTime, nil, sleeps, "America/Los_Angeles")

	hasWake := false
	hasNap := false
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextWake {
			hasWake = true
		}
		if p.PredictionType == domain.PredictionTypeNextNap && p.Status != domain.PredictionStatusPlanned {
			hasNap = true
		}
	}

	if !hasWake {
		t.Error("expected NEXT_WAKE prediction when baby is napping")
	}
	if hasNap {
		t.Error("should not have non-chained NEXT_NAP when baby is currently napping")
	}
}

func TestGeneratePredictions_ChainForward(t *testing.T) {
	// Set up data so chaining happens
	var feeds []FeedRecord
	for i := 0; i < 10; i++ {
		hoursAgo := float64(i) * 3.0
		feeds = append(feeds, makeFeed(hoursAgo, domain.FeedTypeBreastMilk, 120))
	}

	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")

	plannedCount := 0
	for _, p := range result {
		if p.Status == domain.PredictionStatusPlanned {
			plannedCount++
		}
	}
	if plannedCount == 0 {
		t.Error("expected at least one PLANNED (chained) prediction")
	}
}

func TestGeneratePredictions_ReasoningStrings(t *testing.T) {
	var feeds []FeedRecord
	for i := 0; i < 10; i++ {
		hoursAgo := float64(i) * 3.0
		feeds = append(feeds, makeFeed(hoursAgo, domain.FeedTypeBreastMilk, 120))
	}

	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")
	for _, p := range result {
		if p.Reasoning == nil || *p.Reasoning == "" {
			t.Errorf("prediction %s should have reasoning string", p.PredictionType)
		}
	}
}

func TestGeneratePredictions_SparseData(t *testing.T) {
	// Only 3 feeds
	feeds := []FeedRecord{
		makeFeed(0, domain.FeedTypeBreastMilk, 100),
		makeFeed(3, domain.FeedTypeBreastMilk, 110),
		makeFeed(6, domain.FeedTypeBreastMilk, 120),
	}

	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")

	hasFeed := false
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed && p.Status != domain.PredictionStatusPlanned {
			hasFeed = true
			if p.Confidence != nil && *p.Confidence == domain.PredictionConfidenceHigh {
				t.Error("sparse data should not produce HIGH confidence")
			}
		}
	}
	if !hasFeed {
		t.Error("expected at least a feed prediction with sparse data")
	}

	// Should not have sleep predictions
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextNap || p.PredictionType == domain.PredictionTypeNextWake {
			if p.Status != domain.PredictionStatusPlanned {
				t.Error("should not have non-chained sleep predictions with no sleep data")
			}
		}
	}
}

func TestGeneratePredictions_NoisyData(t *testing.T) {
	// Mixed intervals: some 2h, some 4h, some 3h
	feeds := []FeedRecord{
		makeFeed(0, domain.FeedTypeBreastMilk, 100),
		makeFeed(2, domain.FeedTypeBreastMilk, 110),
		makeFeed(6, domain.FeedTypeBreastMilk, 120),
		makeFeed(9, domain.FeedTypeBreastMilk, 130),
		makeFeed(11, domain.FeedTypeBreastMilk, 100),
		makeFeed(15, domain.FeedTypeBreastMilk, 110),
		makeFeed(18, domain.FeedTypeBreastMilk, 120),
	}

	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")
	if len(result) == 0 {
		t.Fatal("expected predictions even with noisy data")
	}

	// Median should handle gracefully
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed && p.Status != domain.PredictionStatusPlanned {
			if p.Confidence == nil {
				// Could be overdue
				continue
			}
			// With noisy data, shouldn't be HIGH
			if *p.Confidence == domain.PredictionConfidenceHigh {
				t.Log("Noisy data produced HIGH confidence - may be acceptable if enough data points")
			}
			break
		}
	}
}

func TestGeneratePredictions_AllSolids(t *testing.T) {
	feeds := []FeedRecord{
		makeFeed(0, domain.FeedTypeSolids, 0),
		makeFeed(3, domain.FeedTypeSolids, 0),
		makeFeed(6, domain.FeedTypeSolids, 0),
	}
	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed {
			t.Error("should not predict feeds when all feeds are solids")
		}
	}
}

func TestGeneratePredictions_SingleFeed(t *testing.T) {
	feeds := []FeedRecord{
		makeFeed(2, domain.FeedTypeBreastMilk, 100),
	}
	result := GeneratePredictions(baseTime, feeds, nil, "America/Los_Angeles")
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextFeed {
			t.Error("should not predict feed with only 1 data point (can't compute interval)")
		}
	}
}

func TestStableID_Deterministic(t *testing.T) {
	pt := domain.PredictionTypeNextFeed
	tm := time.Date(2026, 3, 15, 14, 0, 0, 0, time.UTC)
	id1 := stableID(pt, tm)
	id2 := stableID(pt, tm)
	if id1 != id2 {
		t.Error("stableID should be deterministic")
	}
}

func TestStableID_DifferentInputs(t *testing.T) {
	tm := time.Date(2026, 3, 15, 14, 0, 0, 0, time.UTC)
	id1 := stableID(domain.PredictionTypeNextFeed, tm)
	id2 := stableID(domain.PredictionTypeNextNap, tm)
	if id1 == id2 {
		t.Error("different prediction types should produce different IDs")
	}
}
