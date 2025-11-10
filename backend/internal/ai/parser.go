package ai

import (
	"time"

	"github.com/swatkatz/babybaton/backend/graph/model"
)

// ConvertToParsedActivities converts Claude's JSON response to ParsedActivity output types
func ConvertToParsedActivities(activities []map[string]interface{}) ([]*model.ParsedActivity, []string) {
	var result []*model.ParsedActivity
	var errors []string

	for _, act := range activities {
		activityType, ok := act["activity_type"].(string)
		if !ok {
			errors = append(errors, "Missing activity_type")
			continue
		}

		output := &model.ParsedActivity{
			ActivityType: model.ActivityType(activityType),
		}

		// Parse feed details
		if feedDetails, ok := act["feed_details"].(map[string]interface{}); ok {
			output.FeedDetails = parseFeedDetailsOutput(feedDetails)
		}

		// Parse diaper details
		if diaperDetails, ok := act["diaper_details"].(map[string]interface{}); ok {
			output.DiaperDetails = parseDiaperDetailsOutput(diaperDetails)
		}

		// Parse sleep details
		if sleepDetails, ok := act["sleep_details"].(map[string]interface{}); ok {
			output.SleepDetails = parseSleepDetailsOutput(sleepDetails)
		}

		result = append(result, output)
	}

	return result, errors
}

func parseFeedDetailsOutput(details map[string]interface{}) *model.FeedDetails {
	fd := &model.FeedDetails{}

	if startTime, ok := details["start_time"].(string); ok {
		t, _ := time.Parse(time.RFC3339, startTime)
		fd.StartTime = t
	}

	if endTime, ok := details["end_time"].(string); ok && endTime != "" {
		t, _ := time.Parse(time.RFC3339, endTime)
		fd.EndTime = &t
	}

	if amountMl, ok := details["amount_ml"].(float64); ok {
		amt := int32(amountMl)
		fd.AmountMl = &amt
	}

	if feedType, ok := details["feed_type"].(string); ok {
		ft := model.FeedType(feedType)
		fd.FeedType = &ft
	}

	// Calculate duration if both times exist
	if fd.EndTime != nil {
		duration := int32(fd.EndTime.Sub(fd.StartTime).Minutes())
		fd.DurationMinutes = &duration
	}

	return fd
}

func parseDiaperDetailsOutput(details map[string]interface{}) *model.DiaperDetails {
	dd := &model.DiaperDetails{}

	if changedAt, ok := details["changed_at"].(string); ok {
		t, _ := time.Parse(time.RFC3339, changedAt)
		dd.ChangedAt = t
	}

	if hadPoop, ok := details["had_poop"].(bool); ok {
		dd.HadPoop = hadPoop
	}

	if hadPee, ok := details["had_pee"].(bool); ok {
		dd.HadPee = hadPee
	}

	return dd
}

func parseSleepDetailsOutput(details map[string]interface{}) *model.SleepDetails {
	sd := &model.SleepDetails{}

	if startTime, ok := details["start_time"].(string); ok {
		t, _ := time.Parse(time.RFC3339, startTime)
		sd.StartTime = t
	}

	if endTime, ok := details["end_time"].(string); ok && endTime != "" {
		t, _ := time.Parse(time.RFC3339, endTime)
		sd.EndTime = &t
	}

	// Calculate duration and isActive
	if sd.EndTime != nil {
		duration := int32(sd.EndTime.Sub(sd.StartTime).Minutes())
		sd.DurationMinutes = &duration
		isActive := false
		sd.IsActive = &isActive
	} else {
		isActive := true
		sd.IsActive = &isActive
	}

	return sd
}

// ConvertToActivityInputs converts Claude's JSON response to ActivityInput types
func ConvertToActivityInputs(activities []map[string]interface{}) ([]*model.ActivityInput, []string) {
	var result []*model.ActivityInput
	var errors []string

	for _, act := range activities {
		activityType, ok := act["activity_type"].(string)
		if !ok {
			errors = append(errors, "Missing activity_type")
			continue
		}

		input := &model.ActivityInput{
			ActivityType: model.ActivityType(activityType),
		}

		// Parse feed details
		if feedDetails, ok := act["feed_details"].(map[string]interface{}); ok {
			input.FeedDetails = parseFeedDetails(feedDetails)
		}

		// Parse diaper details
		if diaperDetails, ok := act["diaper_details"].(map[string]interface{}); ok {
			input.DiaperDetails = parseDiaperDetails(diaperDetails)
		}

		// Parse sleep details
		if sleepDetails, ok := act["sleep_details"].(map[string]interface{}); ok {
			input.SleepDetails = parseSleepDetails(sleepDetails)
		}

		result = append(result, input)
	}

	return result, errors
}

func parseFeedDetails(details map[string]interface{}) *model.FeedDetailsInput {
	fd := &model.FeedDetailsInput{}

	if startTime, ok := details["start_time"].(string); ok {
		t, _ := time.Parse(time.RFC3339, startTime)
		fd.StartTime = t
	}

	if endTime, ok := details["end_time"].(string); ok && endTime != "" {
		t, _ := time.Parse(time.RFC3339, endTime)
		fd.EndTime = &t
	}

	if amountMl, ok := details["amount_ml"].(float64); ok {
		amt := int32(amountMl)
		fd.AmountMl = &amt
	}

	if feedType, ok := details["feed_type"].(string); ok {
		ft := model.FeedType(feedType)
		fd.FeedType = &ft
	}

	return fd
}

func parseDiaperDetails(details map[string]interface{}) *model.DiaperDetailsInput {
	dd := &model.DiaperDetailsInput{}

	if changedAt, ok := details["changed_at"].(string); ok {
		t, _ := time.Parse(time.RFC3339, changedAt)
		dd.ChangedAt = t
	}

	if hadPoop, ok := details["had_poop"].(bool); ok {
		dd.HadPoop = hadPoop
	}

	if hadPee, ok := details["had_pee"].(bool); ok {
		pee := hadPee
		dd.HadPee = &pee
	}

	return dd
}

func parseSleepDetails(details map[string]interface{}) *model.SleepDetailsInput {
	sd := &model.SleepDetailsInput{}

	if startTime, ok := details["start_time"].(string); ok {
		t, _ := time.Parse(time.RFC3339, startTime)
		sd.StartTime = t
	}

	if endTime, ok := details["end_time"].(string); ok && endTime != "" {
		t, _ := time.Parse(time.RFC3339, endTime)
		sd.EndTime = &t
	}

	return sd
}