package graph

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/swatkatz/babybaton/backend/graph/model"
	"github.com/swatkatz/babybaton/backend/internal/domain"
	"github.com/swatkatz/babybaton/backend/internal/mapper"
)

// loadCareSessionWithActivities loads all activities and details for a care session.
// Extracted from schema.resolvers.go so gqlgen doesn't move it to the "unknown code" section.
func (r *queryResolver) loadCareSessionWithActivities(ctx context.Context, session *domain.CareSession) (*model.CareSession, error) {
	// Get all activities for the session
	activities, err := r.store.GetActivitiesForSession(ctx, session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities: %w", err)
	}

	fmt.Printf("📋 Loading %d activities for session %s\n", len(activities), session.ID)

	// Load details for each activity and convert to GraphQL types
	graphQLActivities := make([]model.Activity, 0, len(activities))

	// Variables for summary calculation
	var totalFeeds, totalMl, totalDiaperChanges, totalSleepMinutes int32
	var lastFeedTime, lastSleepTime *time.Time
	var currentlyAsleep bool

	for _, activity := range activities {
		fmt.Printf("   🔍 Processing activity %s (type: %s)\n", activity.ID, activity.ActivityType)
		switch activity.ActivityType {
		case domain.ActivityTypeFeed:
			fmt.Printf("   📥 Loading feed details for activity %s\n", activity.ID)
			feedDetails, err := r.store.GetFeedDetails(ctx, activity.ID)
			if err != nil {
				return nil, fmt.Errorf("failed to get feed details: %w", err)
			}
			fmt.Printf("   ✅ Feed details loaded successfully\n")

			graphQLActivities = append(graphQLActivities, &model.FeedActivity{
				ID:           activity.ID.String(),
				ActivityType: model.ActivityType(strings.ToUpper(string(activity.ActivityType))),
				CreatedAt:    activity.CreatedAt,
				FeedDetails:  mapper.FeedDetailsToGraphQL(feedDetails),
			})

			// Update summary
			totalFeeds++
			if feedDetails.AmountMl != nil {
				totalMl += int32(*feedDetails.AmountMl)
			}
			feedTime := feedDetails.StartTime
			if lastFeedTime == nil || feedTime.After(*lastFeedTime) {
				lastFeedTime = &feedTime
			}

		case domain.ActivityTypeDiaper:
			diaperDetails, err := r.store.GetDiaperDetails(ctx, activity.ID)
			if err != nil {
				return nil, fmt.Errorf("failed to get diaper details: %w", err)
			}

			graphQLActivities = append(graphQLActivities, &model.DiaperActivity{
				ID:            activity.ID.String(),
				ActivityType:  model.ActivityType(strings.ToUpper(string(activity.ActivityType))),
				CreatedAt:     activity.CreatedAt,
				DiaperDetails: mapper.DiaperDetailsToGraphQL(diaperDetails),
			})

			// Update summary
			totalDiaperChanges++

		case domain.ActivityTypeSleep:
			sleepDetails, err := r.store.GetSleepDetails(ctx, activity.ID)
			if err != nil {
				return nil, fmt.Errorf("failed to get sleep details: %w", err)
			}

			graphQLActivities = append(graphQLActivities, &model.SleepActivity{
				ID:           activity.ID.String(),
				ActivityType: model.ActivityType(strings.ToUpper(string(activity.ActivityType))),
				CreatedAt:    activity.CreatedAt,
				SleepDetails: mapper.SleepDetailsToGraphQL(sleepDetails),
			})

			// Update summary
			sleepTime := sleepDetails.StartTime
			if lastSleepTime == nil || sleepTime.After(*lastSleepTime) {
				lastSleepTime = &sleepTime
			}
			if sleepDetails.DurationMinutes != nil {
				totalSleepMinutes += int32(*sleepDetails.DurationMinutes)
			}
			if sleepDetails.EndTime == nil {
				currentlyAsleep = true
			}
		}
	}

	// Get caregiver
	caregiver, err := r.store.GetCaregiverByID(ctx, session.CaregiverID)
	if err != nil {
		return nil, fmt.Errorf("failed to get caregiver: %w", err)
	}

	// Build GraphQL response
	return &model.CareSession{
		ID:          session.ID.String(),
		Caregiver:   mapper.CaregiverToGraphQL(caregiver),
		Status:      model.CareSessionStatus(strings.ToUpper(string(session.Status))),
		StartedAt:   session.StartedAt,
		CompletedAt: session.CompletedAt,
		Activities:  graphQLActivities,
		Notes:       session.Notes,
		Summary: &model.CareSessionSummary{
			TotalFeeds:         totalFeeds,
			TotalMl:            totalMl,
			TotalDiaperChanges: totalDiaperChanges,
			TotalSleepMinutes:  totalSleepMinutes,
			LastFeedTime:       lastFeedTime,
			LastSleepTime:      lastSleepTime,
			CurrentlyAsleep:    currentlyAsleep,
		},
	}, nil
}

