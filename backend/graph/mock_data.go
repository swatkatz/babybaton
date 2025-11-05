package graph

import (
	"time"

	"github.com/swatkatz/babybaton/backend/graph/model"
)

func stringPtr(s string) *string {
	return &s
}

func int32Ptr(i int32) *int32 {
	return &i
}

func feedTypePtr(ft model.FeedType) *model.FeedType {
	return &ft
}

// GetMockPrediction returns a mock NextFeedPrediction
func GetMockPrediction() *model.NextFeedPrediction {
	now := time.Now()
	predictedTime := now.Add(2 * time.Hour) // 2 hours from now
	
	return &model.NextFeedPrediction{
		PredictedTime:    predictedTime,
		Confidence:       model.PredictionConfidenceHigh,
		MinutesUntilFeed: 120,
		Reasoning:        stringPtr("Based on 70ml feed at 2:00 PM, typically goes 3 hours between feeds"),
	}
}

// GetMockCurrentSession returns a mock in-progress care session
func GetMockCurrentSession() *model.CareSession {
	now := time.Now()
	startTime := now.Add(-2*time.Hour - 45*time.Minute) // Started 2h 45m ago
	
	feedStartTime := startTime
	feedEndTime := startTime.Add(20 * time.Minute)
	
	diaperTime := startTime.Add(55 * time.Minute)
	
	sleepStartTime := startTime.Add(60 * time.Minute)
	
	return &model.CareSession{
		ID: "session-1",
		Caregiver: &model.Caregiver{
			ID:         "caregiver-1",
			Name:       "Mom",
			DeviceID:   "device-123",
			DeviceName: stringPtr("iPhone 12"),
		},
		Status:      model.CareSessionStatusInProgress,
		StartedAt:   startTime,
		CompletedAt: nil,
		Activities: []model.Activity{
			&model.FeedActivity{
				ID:           "activity-1",
				ActivityType: model.ActivityTypeFeed,
				CreatedAt:    feedStartTime,
				FeedDetails: &model.FeedDetails{
					StartTime:       feedStartTime,
					EndTime:         &feedEndTime,
					AmountMl:        int32Ptr(70),
					FeedType:        feedTypePtr(model.FeedTypeFormula),
					DurationMinutes: int32Ptr(20),
				},
			},
			&model.DiaperActivity{
				ID:           "activity-2",
				ActivityType: model.ActivityTypeDiaper,
				CreatedAt:    diaperTime,
				DiaperDetails: &model.DiaperDetails{
					ChangedAt: diaperTime,
					HadPoop:   true,
					HadPee:    true,
				},
			},
			&model.SleepActivity{
				ID:           "activity-3",
				ActivityType: model.ActivityTypeSleep,
				CreatedAt:    sleepStartTime,
				SleepDetails: &model.SleepDetails{
					StartTime:       sleepStartTime,
					EndTime:         nil,
					DurationMinutes: nil,
					IsActive:        true,
				},
			},
		},
		Notes: nil,
		Summary: &model.CareSessionSummary{
			TotalFeeds:          1,
			TotalMl:             70,
			TotalDiaperChanges:  1,
			TotalSleepMinutes:   165,
			LastFeedTime:        &feedStartTime,
			LastSleepTime:       &sleepStartTime,
			CurrentlyAsleep:     true,
		},
	}
}

func GetMockRecentSessions() []*model.CareSession {
	now := time.Now()
	
	session2Start := now.Add(-7 * time.Hour)
	session2End := now.Add(-4*time.Hour - 45*time.Minute)
	feedTime2 := session2Start.Add(30 * time.Minute)
	sleepTime2 := session2Start.Add(45 * time.Minute)
	
	session3Start := now.Add(-10 * time.Hour)
	session3End := now.Add(-6*time.Hour - 45*time.Minute)
	feedTime3 := session3Start.Add(30 * time.Minute)
	sleepTime3 := session3Start.Add(60 * time.Minute)
	
	return []*model.CareSession{
		{
			ID: "session-2",
			Caregiver: &model.Caregiver{
				ID:         "caregiver-2",
				Name:       "Dad",
				DeviceID:   "device-456",
				DeviceName: stringPtr("Pixel 7"),
			},
			Status:      model.CareSessionStatusCompleted,
			StartedAt:   session2Start,
			CompletedAt: &session2End,
			Activities:  []model.Activity{}, // Empty for recent sessions summary view
			Notes:       nil,
			Summary: &model.CareSessionSummary{
				TotalFeeds:          2,
				TotalMl:             130,
				TotalDiaperChanges:  2,
				TotalSleepMinutes:   60,
				LastFeedTime:        &feedTime2,
				LastSleepTime:       &sleepTime2,
				CurrentlyAsleep:     false,
			},
		},
		{
			ID: "session-3",
			Caregiver: &model.Caregiver{
				ID:         "caregiver-3",
				Name:       "Nana",
				DeviceID:   "device-667",
				DeviceName: stringPtr("Pixel 7"),
			},
			Status:      model.CareSessionStatusCompleted,
			StartedAt:   session3Start,
			CompletedAt: &session3End,
			Activities:  []model.Activity{},
			Notes:       nil,
			Summary: &model.CareSessionSummary{
				TotalFeeds:          2,
				TotalMl:             130,
				TotalDiaperChanges:  2,
				TotalSleepMinutes:   60,
				LastFeedTime:        &feedTime3,
				LastSleepTime:       &sleepTime3,
				CurrentlyAsleep:     false,
			},
		},
	}
}
