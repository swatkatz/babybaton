package prediction

import (
	"sort"
	"testing"
	"time"

	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func ptrFloat(v float64) *float64 { return &v }
func ptrInt(v int) *int           { return &v }
func ptrStr(v string) *string     { return &v }

// --- BlendValue tests ---

func TestBlendValue_GoalsOnly_NoData(t *testing.T) {
	result := BlendValue(nil, 0, ptrFloat(180))
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Value != 180 {
		t.Errorf("expected 180, got %v", result.Value)
	}
	if result.Confidence != domain.PredictionConfidenceLow {
		t.Errorf("expected LOW confidence, got %v", result.Confidence)
	}
	if result.Reasoning != "Using your target (not enough data yet)" {
		t.Errorf("unexpected reasoning: %s", result.Reasoning)
	}
}

func TestBlendValue_DataOnly_NoGoals(t *testing.T) {
	result := BlendValue(ptrFloat(150), 10, nil)
	if result != nil {
		t.Errorf("expected nil (caller uses original prediction), got %v", result)
	}
}

func TestBlendValue_BothPresent_EnoughData(t *testing.T) {
	result := BlendValue(ptrFloat(150), 10, ptrFloat(180))
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Value != 150 {
		t.Errorf("expected 150 (data wins), got %v", result.Value)
	}
	// 150 vs 180 = ~17% diff, should be MEDIUM
	if result.Confidence != domain.PredictionConfidenceMedium {
		t.Errorf("expected MEDIUM confidence, got %v", result.Confidence)
	}
}

func TestBlendValue_BothPresent_SparseData(t *testing.T) {
	// 0.4 * 150 + 0.6 * 180 = 60 + 108 = 168
	result := BlendValue(ptrFloat(150), 5, ptrFloat(180))
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Value != 168 {
		t.Errorf("expected 168 (blended), got %v", result.Value)
	}
	if result.Confidence != domain.PredictionConfidenceMedium {
		t.Errorf("expected MEDIUM confidence, got %v", result.Confidence)
	}
}

func TestBlendValue_BothPresent_VeryLittleData(t *testing.T) {
	result := BlendValue(ptrFloat(150), 2, ptrFloat(180))
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Value != 180 {
		t.Errorf("expected 180 (goal wins), got %v", result.Value)
	}
	if result.Confidence != domain.PredictionConfidenceLow {
		t.Errorf("expected LOW confidence, got %v", result.Confidence)
	}
}

func TestBlendValue_NoGoals_NoData(t *testing.T) {
	result := BlendValue(nil, 0, nil)
	if result != nil {
		t.Errorf("expected nil, got %v", result)
	}
}

func TestBlendValue_GoalAndDataAgree(t *testing.T) {
	// 178 vs 180 = ~1.1% difference, within 10%
	result := BlendValue(ptrFloat(178), 10, ptrFloat(180))
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Confidence != domain.PredictionConfidenceHigh {
		t.Errorf("expected HIGH confidence (agreement), got %v", result.Confidence)
	}
}

func TestBlendValue_GoalAndDataDiverge(t *testing.T) {
	// 120 vs 180 = 33% difference, way beyond 10%
	result := BlendValue(ptrFloat(120), 10, ptrFloat(180))
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Confidence != domain.PredictionConfidenceMedium {
		t.Errorf("expected MEDIUM confidence (diverge), got %v", result.Confidence)
	}
	if result.Value != 120 {
		t.Errorf("expected 120 (data wins with enough data), got %v", result.Value)
	}
}

// --- BlendTime tests ---

func TestBlendTime_AcrossMidnight(t *testing.T) {
	// Observed 23:30, goal 00:15 — should handle midnight wraparound
	observed := "23:30"
	goal := "00:15"
	result := BlendTime(&observed, 10, &goal)
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	// 23:30=1410min, 00:15=15min → diff=1395 >720, so shift goal to 1455
	// With >=7 data points, data wins → 1410 → normalize = 1410 → "23:30"
	mins := int(result.Value)
	if mins != 1410 {
		t.Errorf("expected 1410 (23:30), got %d", mins)
	}
}

func TestBlendTime_SparseData_AcrossMidnight(t *testing.T) {
	observed := "23:30"
	goal := "00:15"
	result := BlendTime(&observed, 5, &goal)
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	// 23:30=1410min, 00:15=15min → shift goal to 1455
	// Blend: 0.4*1410 + 0.6*1455 = 564 + 873 = 1437 → round = 1437 → 23:57
	mins := int(result.Value)
	if mins != 1437 {
		t.Errorf("expected 1437 (23:57), got %d", mins)
	}
}

func TestBlendTime_GoalOnly(t *testing.T) {
	goal := "19:30"
	result := BlendTime(nil, 0, &goal)
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	mins := int(result.Value)
	expected := 19*60 + 30
	if mins != expected {
		t.Errorf("expected %d (19:30), got %d", expected, mins)
	}
}

// --- ConstrainNapCount tests ---

func TestConstrainNapCount_GoalConstrains(t *testing.T) {
	predictions := []*domain.Prediction{
		{PredictionType: domain.PredictionTypeNextFeed},
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeBedtime},
	}
	result := ConstrainNapCount(predictions, ptrInt(2))

	napCount := 0
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextNap {
			napCount++
		}
	}
	if napCount != 2 {
		t.Errorf("expected 2 nap predictions, got %d", napCount)
	}
}

func TestConstrainNapCount_NilGoal(t *testing.T) {
	predictions := []*domain.Prediction{
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeNextNap},
	}
	result := ConstrainNapCount(predictions, nil)
	if len(result) != 3 {
		t.Errorf("expected 3 predictions unchanged, got %d", len(result))
	}
}

func TestConstrainNapCount_ZeroGoal(t *testing.T) {
	predictions := []*domain.Prediction{
		{PredictionType: domain.PredictionTypeNextFeed},
		{PredictionType: domain.PredictionTypeNextNap},
		{PredictionType: domain.PredictionTypeNextNap},
	}
	result := ConstrainNapCount(predictions, ptrInt(0))

	napCount := 0
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextNap {
			napCount++
		}
	}
	if napCount != 0 {
		t.Errorf("expected 0 nap predictions, got %d", napCount)
	}
}

// --- ConstrainNapDuration tests ---

func TestConstrainNapDuration_GoalConstrains(t *testing.T) {
	dur := 120
	predictions := []*domain.Prediction{
		{
			PredictionType:           domain.PredictionTypeNextNap,
			PredictedDurationMinutes: &dur,
		},
	}
	result := ConstrainNapDuration(predictions, ptrInt(90))
	if *result[0].PredictedDurationMinutes != 90 {
		t.Errorf("expected 90, got %d", *result[0].PredictedDurationMinutes)
	}
}

func TestConstrainNapDuration_NilGoal(t *testing.T) {
	dur := 120
	predictions := []*domain.Prediction{
		{
			PredictionType:           domain.PredictionTypeNextNap,
			PredictedDurationMinutes: &dur,
		},
	}
	result := ConstrainNapDuration(predictions, nil)
	if *result[0].PredictedDurationMinutes != 120 {
		t.Errorf("expected 120 unchanged, got %d", *result[0].PredictedDurationMinutes)
	}
}

// --- BlendPredictions integration tests ---

func TestBlendPredictions_NoGoals_ReturnsUnchanged(t *testing.T) {
	confidence := domain.PredictionConfidenceHigh
	reasoning := "Based on 3.0hr median feed interval from last 12 feeds"
	predictions := []*domain.Prediction{
		{
			PredictionType: domain.PredictionTypeNextFeed,
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		},
	}
	result := BlendPredictions(predictions, nil, 12, 8)
	if len(result) != 1 {
		t.Errorf("expected 1 prediction, got %d", len(result))
	}
	if *result[0].Reasoning != reasoning {
		t.Errorf("reasoning should be unchanged")
	}
}

func TestBlendPredictions_GoalsAndData_DataWins(t *testing.T) {
	confidence := domain.PredictionConfidenceHigh
	reasoning := "Based on 3.0hr median feed interval from last 12 feeds"
	predictions := []*domain.Prediction{
		{
			PredictionType: domain.PredictionTypeNextFeed,
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		},
	}
	goals := &domain.ScheduleGoals{
		TargetFeedIntervalMinutes: ptrInt(240),
	}
	result := BlendPredictions(predictions, goals, 12, 8)
	if len(result) != 1 {
		t.Fatalf("expected 1 prediction, got %d", len(result))
	}
	// With 12 data points, data wins — reasoning should mention goal
	r := *result[0].Reasoning
	if r == reasoning {
		t.Errorf("expected reasoning to be updated with goal info")
	}
}

func TestBlendPredictions_GoalsAndData_SparseBlend(t *testing.T) {
	confidence := domain.PredictionConfidenceMedium
	reasoning := "Based on 2.5hr median feed interval from last 5 feeds"
	predictions := []*domain.Prediction{
		{
			PredictionType: domain.PredictionTypeNextFeed,
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		},
	}
	goals := &domain.ScheduleGoals{
		TargetFeedIntervalMinutes: ptrInt(180),
	}
	result := BlendPredictions(predictions, goals, 5, 4)
	if len(result) != 1 {
		t.Fatalf("expected 1 prediction, got %d", len(result))
	}
	if *result[0].Confidence != domain.PredictionConfidenceMedium {
		t.Errorf("expected MEDIUM confidence for sparse data, got %v", *result[0].Confidence)
	}
}

func TestBlendPredictions_PartialGoals(t *testing.T) {
	feedConfidence := domain.PredictionConfidenceHigh
	feedReasoning := "Based on 3.0hr median feed interval from last 12 feeds"
	napConfidence := domain.PredictionConfidenceMedium
	napReasoning := "Based on 2.0hr median wake window from last 8 naps"

	predictions := []*domain.Prediction{
		{
			PredictionType: domain.PredictionTypeNextFeed,
			Confidence:     &feedConfidence,
			Reasoning:      &feedReasoning,
		},
		{
			PredictionType: domain.PredictionTypeNextNap,
			Confidence:     &napConfidence,
			Reasoning:      &napReasoning,
		},
	}

	// Only wake window goal set — feed prediction should be unchanged
	goals := &domain.ScheduleGoals{
		TargetWakeWindowMinutes: ptrInt(120),
	}
	result := BlendPredictions(predictions, goals, 12, 10)
	if len(result) != 2 {
		t.Fatalf("expected 2 predictions, got %d", len(result))
	}
	// Feed prediction reasoning should be unchanged (no feed goal)
	if *result[0].Reasoning != feedReasoning {
		t.Errorf("feed reasoning should be unchanged, got: %s", *result[0].Reasoning)
	}
	// Nap prediction should mention the goal
	if *result[1].Reasoning == napReasoning {
		t.Errorf("nap reasoning should be updated with goal info")
	}
}

func TestBlendPredictions_AllGoalFieldsNil(t *testing.T) {
	confidence := domain.PredictionConfidenceHigh
	reasoning := "test"
	predictions := []*domain.Prediction{
		{
			PredictionType: domain.PredictionTypeNextFeed,
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		},
	}
	goals := &domain.ScheduleGoals{} // all fields nil
	result := BlendPredictions(predictions, goals, 10, 8)
	if *result[0].Reasoning != "test" {
		t.Errorf("with all nil goal fields, prediction should be unchanged")
	}
}

func TestBlendPredictions_BedtimeGoal(t *testing.T) {
	confidence := domain.PredictionConfidenceHigh
	reasoning := "Based on 8:30pm median bedtime from last 5 nights"
	predictions := []*domain.Prediction{
		{
			PredictionType: domain.PredictionTypeBedtime,
			Confidence:     &confidence,
			Reasoning:      &reasoning,
		},
	}
	goals := &domain.ScheduleGoals{
		TargetBedtime: ptrStr("20:00"),
	}
	result := BlendPredictions(predictions, goals, 10, 10)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	// With 10 data points, should mention goal
	r := *result[0].Reasoning
	if r == reasoning {
		t.Errorf("expected reasoning to mention goal bedtime")
	}
}

// --- GenerateGoalOnlyPredictions tests ---

func TestGenerateGoalOnlyPredictions_NoGoals(t *testing.T) {
	result := GenerateGoalOnlyPredictions(baseTime, nil, "America/Los_Angeles")
	if result != nil {
		t.Errorf("expected nil, got %v", result)
	}
}

func TestGenerateGoalOnlyPredictions_FeedGoal(t *testing.T) {
	goals := &domain.ScheduleGoals{
		TargetFeedIntervalMinutes: ptrInt(180),
	}
	result := GenerateGoalOnlyPredictions(baseTime, goals, "America/Los_Angeles")
	if len(result) != 1 {
		t.Fatalf("expected 1 prediction, got %d", len(result))
	}
	if result[0].PredictionType != domain.PredictionTypeNextFeed {
		t.Errorf("expected NEXT_FEED, got %v", result[0].PredictionType)
	}
	if *result[0].Confidence != domain.PredictionConfidenceLow {
		t.Errorf("expected LOW confidence, got %v", *result[0].Confidence)
	}
	expectedTime := baseTime.Add(180 * time.Minute)
	if !result[0].PredictedTime.Equal(expectedTime) {
		t.Errorf("expected predicted time %v, got %v", expectedTime, result[0].PredictedTime)
	}
}

func TestGenerateGoalOnlyPredictions_AllGoals(t *testing.T) {
	goals := &domain.ScheduleGoals{
		TargetFeedIntervalMinutes: ptrInt(180),
		TargetWakeWindowMinutes:   ptrInt(120),
		TargetBedtime:             ptrStr("20:00"),
		MaxDaytimeNapMinutes:      ptrInt(90),
	}
	result := GenerateGoalOnlyPredictions(baseTime, goals, "America/Los_Angeles")

	typeCount := make(map[domain.PredictionType]int)
	for _, p := range result {
		typeCount[p.PredictionType]++
		if *p.Confidence != domain.PredictionConfidenceLow {
			t.Errorf("all goal-only predictions should be LOW confidence, got %v for %v", *p.Confidence, p.PredictionType)
		}
	}
	if typeCount[domain.PredictionTypeNextFeed] != 1 {
		t.Errorf("expected 1 feed prediction, got %d", typeCount[domain.PredictionTypeNextFeed])
	}
	if typeCount[domain.PredictionTypeNextNap] != 1 {
		t.Errorf("expected 1 nap prediction, got %d", typeCount[domain.PredictionTypeNextNap])
	}
	if typeCount[domain.PredictionTypeBedtime] != 1 {
		t.Errorf("expected 1 bedtime prediction, got %d", typeCount[domain.PredictionTypeBedtime])
	}
}

// --- agreementConfidence tests ---

func TestAgreementConfidence_Within10Percent(t *testing.T) {
	c := agreementConfidence(178, 180)
	if c != domain.PredictionConfidenceHigh {
		t.Errorf("expected HIGH, got %v", c)
	}
}

func TestAgreementConfidence_Beyond10Percent(t *testing.T) {
	c := agreementConfidence(120, 180)
	if c != domain.PredictionConfidenceMedium {
		t.Errorf("expected MEDIUM, got %v", c)
	}
}

// --- Constrain with full BlendPredictions flow ---

func TestBlendPredictions_NapCountAndDuration(t *testing.T) {
	dur1, dur2, dur3 := 120, 100, 110
	predictions := []*domain.Prediction{
		{PredictionType: domain.PredictionTypeNextFeed},
		{PredictionType: domain.PredictionTypeNextNap, PredictedDurationMinutes: &dur1, PredictedTime: time.Now()},
		{PredictionType: domain.PredictionTypeNextNap, PredictedDurationMinutes: &dur2, PredictedTime: time.Now().Add(3 * time.Hour)},
		{PredictionType: domain.PredictionTypeNextNap, PredictedDurationMinutes: &dur3, PredictedTime: time.Now().Add(6 * time.Hour)},
		{PredictionType: domain.PredictionTypeBedtime},
	}

	goals := &domain.ScheduleGoals{
		TargetNapCount:       ptrInt(2),
		MaxDaytimeNapMinutes: ptrInt(90),
	}

	result := BlendPredictions(predictions, goals, 10, 10)

	// Sort by predicted time for consistent ordering
	sort.Slice(result, func(i, j int) bool {
		return result[i].PredictedTime.Before(result[j].PredictedTime)
	})

	napCount := 0
	for _, p := range result {
		if p.PredictionType == domain.PredictionTypeNextNap {
			napCount++
			if p.PredictedDurationMinutes != nil && *p.PredictedDurationMinutes > 90 {
				t.Errorf("nap duration %d exceeds max 90", *p.PredictedDurationMinutes)
			}
		}
	}
	if napCount != 2 {
		t.Errorf("expected 2 naps after constraint, got %d", napCount)
	}
}
