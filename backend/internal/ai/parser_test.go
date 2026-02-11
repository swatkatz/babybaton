package ai

import (
	"testing"
	"time"

	"github.com/swatkatz/babybaton/backend/graph/model"
)

func TestConvertToParsedActivities_Feed(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "FEED",
			"feed_details": map[string]interface{}{
				"start_time": "2024-01-01T10:00:00Z",
				"end_time":   "2024-01-01T10:30:00Z",
				"amount_ml":  float64(120),
				"feed_type":  "BREAST_MILK",
			},
		},
	}

	result, errors := ConvertToParsedActivities(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}

	r := result[0]
	if r.ActivityType != model.ActivityTypeFeed {
		t.Errorf("ActivityType = %q, want %q", r.ActivityType, model.ActivityTypeFeed)
	}
	if r.FeedDetails == nil {
		t.Fatal("expected FeedDetails to be set")
	}

	expectedStart := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	if !r.FeedDetails.StartTime.Equal(expectedStart) {
		t.Errorf("StartTime = %v, want %v", r.FeedDetails.StartTime, expectedStart)
	}

	expectedEnd := time.Date(2024, 1, 1, 10, 30, 0, 0, time.UTC)
	if r.FeedDetails.EndTime == nil || !r.FeedDetails.EndTime.Equal(expectedEnd) {
		t.Errorf("EndTime = %v, want %v", r.FeedDetails.EndTime, expectedEnd)
	}

	if r.FeedDetails.AmountMl == nil || *r.FeedDetails.AmountMl != 120 {
		t.Errorf("AmountMl = %v, want 120", r.FeedDetails.AmountMl)
	}

	if r.FeedDetails.FeedType == nil || *r.FeedDetails.FeedType != model.FeedTypeBreastMilk {
		t.Errorf("FeedType = %v, want BREAST_MILK", r.FeedDetails.FeedType)
	}

	// Duration should be calculated
	if r.FeedDetails.DurationMinutes == nil || *r.FeedDetails.DurationMinutes != 30 {
		t.Errorf("DurationMinutes = %v, want 30", r.FeedDetails.DurationMinutes)
	}
}

func TestConvertToParsedActivities_Diaper(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "DIAPER",
			"diaper_details": map[string]interface{}{
				"changed_at": "2024-01-01T12:00:00Z",
				"had_poop":   true,
				"had_pee":    false,
			},
		},
	}

	result, errors := ConvertToParsedActivities(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}

	r := result[0]
	if r.ActivityType != model.ActivityTypeDiaper {
		t.Errorf("ActivityType = %q, want %q", r.ActivityType, model.ActivityTypeDiaper)
	}
	if r.DiaperDetails == nil {
		t.Fatal("expected DiaperDetails to be set")
	}
	if r.DiaperDetails.HadPoop != true {
		t.Error("HadPoop = false, want true")
	}
	if r.DiaperDetails.HadPee != false {
		t.Error("HadPee = true, want false")
	}
}

func TestConvertToParsedActivities_Sleep(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "SLEEP",
			"sleep_details": map[string]interface{}{
				"start_time": "2024-01-01T14:00:00Z",
				"end_time":   "2024-01-01T15:30:00Z",
			},
		},
	}

	result, errors := ConvertToParsedActivities(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}

	r := result[0]
	if r.ActivityType != model.ActivityTypeSleep {
		t.Errorf("ActivityType = %q, want %q", r.ActivityType, model.ActivityTypeSleep)
	}
	if r.SleepDetails == nil {
		t.Fatal("expected SleepDetails to be set")
	}

	// Duration should be 90 minutes
	if r.SleepDetails.DurationMinutes == nil || *r.SleepDetails.DurationMinutes != 90 {
		t.Errorf("DurationMinutes = %v, want 90", r.SleepDetails.DurationMinutes)
	}

	// Should not be active (has end time)
	if r.SleepDetails.IsActive == nil || *r.SleepDetails.IsActive != false {
		t.Errorf("IsActive = %v, want false", r.SleepDetails.IsActive)
	}
}

func TestConvertToParsedActivities_SleepActive(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "SLEEP",
			"sleep_details": map[string]interface{}{
				"start_time": "2024-01-01T14:00:00Z",
			},
		},
	}

	result, errors := ConvertToParsedActivities(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}

	r := result[0]
	if r.SleepDetails.IsActive == nil || *r.SleepDetails.IsActive != true {
		t.Errorf("IsActive = %v, want true", r.SleepDetails.IsActive)
	}
	if r.SleepDetails.DurationMinutes != nil {
		t.Errorf("DurationMinutes = %v, want nil", r.SleepDetails.DurationMinutes)
	}
}

func TestConvertToParsedActivities_MissingActivityType(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"feed_details": map[string]interface{}{
				"start_time": "2024-01-01T10:00:00Z",
			},
		},
	}

	result, errors := ConvertToParsedActivities(activities)

	if len(errors) != 1 {
		t.Fatalf("expected 1 error, got %d: %v", len(errors), errors)
	}
	if errors[0] != "Missing activity_type" {
		t.Errorf("error = %q, want %q", errors[0], "Missing activity_type")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 results, got %d", len(result))
	}
}

func TestConvertToParsedActivities_MultipleActivities(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "FEED",
			"feed_details": map[string]interface{}{
				"start_time": "2024-01-01T10:00:00Z",
			},
		},
		{
			"activity_type": "DIAPER",
			"diaper_details": map[string]interface{}{
				"changed_at": "2024-01-01T12:00:00Z",
				"had_poop":   true,
				"had_pee":    true,
			},
		},
	}

	result, errors := ConvertToParsedActivities(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result))
	}
	if result[0].ActivityType != model.ActivityTypeFeed {
		t.Errorf("first activity = %q, want FEED", result[0].ActivityType)
	}
	if result[1].ActivityType != model.ActivityTypeDiaper {
		t.Errorf("second activity = %q, want DIAPER", result[1].ActivityType)
	}
}

func TestConvertToParsedActivities_EmptyInput(t *testing.T) {
	result, errors := ConvertToParsedActivities(nil)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 results, got %d", len(result))
	}
}

func TestConvertToActivityInputs_Feed(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "FEED",
			"feed_details": map[string]interface{}{
				"start_time": "2024-01-01T10:00:00Z",
				"end_time":   "2024-01-01T10:30:00Z",
				"amount_ml":  float64(150),
				"feed_type":  "FORMULA",
			},
		},
	}

	result, errors := ConvertToActivityInputs(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}

	r := result[0]
	if r.ActivityType != model.ActivityTypeFeed {
		t.Errorf("ActivityType = %q, want FEED", r.ActivityType)
	}
	if r.FeedDetails == nil {
		t.Fatal("expected FeedDetails to be set")
	}

	expectedStart := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	if !r.FeedDetails.StartTime.Equal(expectedStart) {
		t.Errorf("StartTime = %v, want %v", r.FeedDetails.StartTime, expectedStart)
	}

	if r.FeedDetails.AmountMl == nil || *r.FeedDetails.AmountMl != 150 {
		t.Errorf("AmountMl = %v, want 150", r.FeedDetails.AmountMl)
	}

	if r.FeedDetails.FeedType == nil || *r.FeedDetails.FeedType != model.FeedTypeFormula {
		t.Errorf("FeedType = %v, want FORMULA", r.FeedDetails.FeedType)
	}
}

func TestConvertToActivityInputs_Diaper(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "DIAPER",
			"diaper_details": map[string]interface{}{
				"changed_at": "2024-01-01T12:00:00Z",
				"had_poop":   false,
				"had_pee":    true,
			},
		},
	}

	result, errors := ConvertToActivityInputs(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}

	r := result[0]
	if r.DiaperDetails == nil {
		t.Fatal("expected DiaperDetails to be set")
	}
	if r.DiaperDetails.HadPoop != false {
		t.Error("HadPoop = true, want false")
	}
	if r.DiaperDetails.HadPee == nil || *r.DiaperDetails.HadPee != true {
		t.Errorf("HadPee = %v, want true", r.DiaperDetails.HadPee)
	}
}

func TestConvertToActivityInputs_Sleep(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "SLEEP",
			"sleep_details": map[string]interface{}{
				"start_time": "2024-01-01T14:00:00Z",
				"end_time":   "2024-01-01T15:00:00Z",
			},
		},
	}

	result, errors := ConvertToActivityInputs(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}

	r := result[0]
	if r.SleepDetails == nil {
		t.Fatal("expected SleepDetails to be set")
	}

	expectedStart := time.Date(2024, 1, 1, 14, 0, 0, 0, time.UTC)
	if !r.SleepDetails.StartTime.Equal(expectedStart) {
		t.Errorf("StartTime = %v, want %v", r.SleepDetails.StartTime, expectedStart)
	}

	expectedEnd := time.Date(2024, 1, 1, 15, 0, 0, 0, time.UTC)
	if r.SleepDetails.EndTime == nil || !r.SleepDetails.EndTime.Equal(expectedEnd) {
		t.Errorf("EndTime = %v, want %v", r.SleepDetails.EndTime, expectedEnd)
	}
}

func TestConvertToActivityInputs_MissingActivityType(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"not_the_type": "FEED",
		},
	}

	result, errors := ConvertToActivityInputs(activities)

	if len(errors) != 1 {
		t.Fatalf("expected 1 error, got %d: %v", len(errors), errors)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 results, got %d", len(result))
	}
}

func TestConvertToActivityInputs_EmptyInput(t *testing.T) {
	result, errors := ConvertToActivityInputs(nil)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 results, got %d", len(result))
	}
}

func TestConvertToActivityInputs_FeedNoEndTime(t *testing.T) {
	activities := []map[string]interface{}{
		{
			"activity_type": "FEED",
			"feed_details": map[string]interface{}{
				"start_time": "2024-01-01T10:00:00Z",
			},
		},
	}

	result, errors := ConvertToActivityInputs(activities)

	if len(errors) != 0 {
		t.Fatalf("unexpected errors: %v", errors)
	}

	r := result[0]
	if r.FeedDetails.EndTime != nil {
		t.Errorf("EndTime = %v, want nil", r.FeedDetails.EndTime)
	}
}
