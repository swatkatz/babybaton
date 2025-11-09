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

func boolPtr(b bool) *bool {
    return &b
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
					IsActive:        boolPtr(true),
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

	session3Start := now.Add(-10 * time.Hour)
	session3End := now.Add(-6*time.Hour - 45*time.Minute)

	// Session 2 activity times
	feed2_1Start := session2Start.Add(15 * time.Minute)
	feed2_1End := feed2_1Start.Add(15 * time.Minute)
	diaper2_1Time := session2Start.Add(35 * time.Minute)
	sleep2Start := session2Start.Add(45 * time.Minute)
	sleep2End := sleep2Start.Add(60 * time.Minute)
	feed2_2Start := session2Start.Add(120 * time.Minute)
	feed2_2End := feed2_2Start.Add(12 * time.Minute)
	diaper2_2Time := session2Start.Add(135 * time.Minute)

	// Session 3 activity times
	feed3_1Start := session3Start.Add(20 * time.Minute)
	feed3_1End := feed3_1Start.Add(18 * time.Minute)
	diaper3_1Time := session3Start.Add(50 * time.Minute)
	sleep3Start := session3Start.Add(60 * time.Minute)
	sleep3End := sleep3Start.Add(60 * time.Minute)
	feed3_2Start := session3Start.Add(135 * time.Minute)
	feed3_2End := feed3_2Start.Add(10 * time.Minute)
	diaper3_2Time := session3Start.Add(180 * time.Minute)

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
			Activities: []model.Activity{
				&model.FeedActivity{
					ID:           "activity-2-1",
					ActivityType: model.ActivityTypeFeed,
					CreatedAt:    feed2_1Start,
					FeedDetails: &model.FeedDetails{
						StartTime:       feed2_1Start,
						EndTime:         &feed2_1End,
						AmountMl:        int32Ptr(60),
						FeedType:        feedTypePtr(model.FeedTypeBreastMilk),
						DurationMinutes: int32Ptr(15),
					},
				},
				&model.DiaperActivity{
					ID:           "activity-2-2",
					ActivityType: model.ActivityTypeDiaper,
					CreatedAt:    diaper2_1Time,
					DiaperDetails: &model.DiaperDetails{
						ChangedAt: diaper2_1Time,
						HadPoop:   false,
						HadPee:    true,
					},
				},
				&model.SleepActivity{
					ID:           "activity-2-3",
					ActivityType: model.ActivityTypeSleep,
					CreatedAt:    sleep2Start,
					SleepDetails: &model.SleepDetails{
						StartTime:       sleep2Start,
						EndTime:         &sleep2End,
						DurationMinutes: int32Ptr(60),
						IsActive:        boolPtr(false),
					},
				},
				&model.FeedActivity{
					ID:           "activity-2-4",
					ActivityType: model.ActivityTypeFeed,
					CreatedAt:    feed2_2Start,
					FeedDetails: &model.FeedDetails{
						StartTime:       feed2_2Start,
						EndTime:         &feed2_2End,
						AmountMl:        int32Ptr(70),
						FeedType:        feedTypePtr(model.FeedTypeFormula),
						DurationMinutes: int32Ptr(12),
					},
				},
				&model.DiaperActivity{
					ID:           "activity-2-5",
					ActivityType: model.ActivityTypeDiaper,
					CreatedAt:    diaper2_2Time,
					DiaperDetails: &model.DiaperDetails{
						ChangedAt: diaper2_2Time,
						HadPoop:   true,
						HadPee:    true,
					},
				},
			},
			Notes: nil,
			Summary: &model.CareSessionSummary{
				TotalFeeds:          2,
				TotalMl:             130,
				TotalDiaperChanges:  2,
				TotalSleepMinutes:   60,
				LastFeedTime:        &feed2_2Start,
				LastSleepTime:       &sleep2Start,
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
			Activities: []model.Activity{
				&model.FeedActivity{
					ID:           "activity-3-1",
					ActivityType: model.ActivityTypeFeed,
					CreatedAt:    feed3_1Start,
					FeedDetails: &model.FeedDetails{
						StartTime:       feed3_1Start,
						EndTime:         &feed3_1End,
						AmountMl:        int32Ptr(65),
						FeedType:        feedTypePtr(model.FeedTypeFormula),
						DurationMinutes: int32Ptr(18),
					},
				},
				&model.DiaperActivity{
					ID:           "activity-3-2",
					ActivityType: model.ActivityTypeDiaper,
					CreatedAt:    diaper3_1Time,
					DiaperDetails: &model.DiaperDetails{
						ChangedAt: diaper3_1Time,
						HadPoop:   true,
						HadPee:    true,
					},
				},
				&model.SleepActivity{
					ID:           "activity-3-3",
					ActivityType: model.ActivityTypeSleep,
					CreatedAt:    sleep3Start,
					SleepDetails: &model.SleepDetails{
						StartTime:       sleep3Start,
						EndTime:         &sleep3End,
						DurationMinutes: int32Ptr(60),
						IsActive:        boolPtr(false),
					},
				},
				&model.FeedActivity{
					ID:           "activity-3-4",
					ActivityType: model.ActivityTypeFeed,
					CreatedAt:    feed3_2Start,
					FeedDetails: &model.FeedDetails{
						StartTime:       feed3_2Start,
						EndTime:         &feed3_2End,
						AmountMl:        int32Ptr(65),
						FeedType:        feedTypePtr(model.FeedTypeBreastMilk),
						DurationMinutes: int32Ptr(10),
					},
				},
				&model.DiaperActivity{
					ID:           "activity-3-5",
					ActivityType: model.ActivityTypeDiaper,
					CreatedAt:    diaper3_2Time,
					DiaperDetails: &model.DiaperDetails{
						ChangedAt: diaper3_2Time,
						HadPoop:   false,
						HadPee:    true,
					},
				},
			},
			Notes: nil,
			Summary: &model.CareSessionSummary{
				TotalFeeds:          2,
				TotalMl:             130,
				TotalDiaperChanges:  2,
				TotalSleepMinutes:   60,
				LastFeedTime:        &feed3_2Start,
				LastSleepTime:       &sleep3Start,
				CurrentlyAsleep:     false,
			},
		},
	}
}
