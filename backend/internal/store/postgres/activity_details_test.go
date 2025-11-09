package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestActivityDetailsOperations(t *testing.T) {
	// Connect to TEST database
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	// Create unique test family using helper
	family, caregiver, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family: %v", err)
	}

	// Cleanup at the END of all subtests
	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
		t.Logf("✓ Cleaned up test family %s", family.ID)
	})

	// Create test session
	session := &domain.CareSession{
		ID:          uuid.New(),
		CaregiverID: caregiver.ID,
		FamilyID:    family.ID,
		Status:      domain.StatusInProgress,
		StartedAt:   time.Now(),
		CompletedAt: nil,
		Notes:       nil,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err = store.CreateCareSession(ctx, session)
	if err != nil {
		t.Fatalf("Failed to create test session: %v", err)
	}

	// Create activities
	feedActivity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session.ID,
		ActivityType:  domain.ActivityTypeFeed,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	diaperActivity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session.ID,
		ActivityType:  domain.ActivityTypeDiaper,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	sleepActivity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session.ID,
		ActivityType:  domain.ActivityTypeSleep,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	store.CreateActivity(ctx, feedActivity)
	store.CreateActivity(ctx, diaperActivity)
	store.CreateActivity(ctx, sleepActivity)

	// Test Feed Details
	t.Run("FeedDetails", func(t *testing.T) {
		startTime := time.Now()
		endTime := startTime.Add(15 * time.Minute)
		amountMl := 120
		feedType := domain.FeedTypeFormula

		feedDetails := &domain.FeedDetails{
			ID:         uuid.New(),
			ActivityID: feedActivity.ID,
			StartTime:  startTime,
			EndTime:    &endTime,
			AmountMl:   &amountMl,
			FeedType:   &feedType,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		// Create
		err := store.CreateFeedDetails(ctx, feedDetails)
		if err != nil {
			t.Fatalf("Failed to create feed details: %v", err)
		}
		t.Logf("✓ Created feed details")

		// Get
		retrieved, err := store.GetFeedDetails(ctx, feedActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get feed details: %v", err)
		}
		if retrieved.ActivityID != feedActivity.ID {
			t.Error("Activity ID mismatch")
		}
		if retrieved.AmountMl == nil || *retrieved.AmountMl != 120 {
			t.Error("Amount mismatch")
		}
		if retrieved.FeedType == nil || *retrieved.FeedType != domain.FeedTypeFormula {
			t.Error("Feed type mismatch")
		}
		t.Logf("✓ Retrieved feed details: %dml %s", *retrieved.AmountMl, *retrieved.FeedType)
	})

	// Test Diaper Details
	t.Run("DiaperDetails", func(t *testing.T) {
		changedAt := time.Now()

		diaperDetails := &domain.DiaperDetails{
			ID:         uuid.New(),
			ActivityID: diaperActivity.ID,
			ChangedAt:  changedAt,
			HadPoop:    true,
			HadPee:     true,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		// Create
		err := store.CreateDiaperDetails(ctx, diaperDetails)
		if err != nil {
			t.Fatalf("Failed to create diaper details: %v", err)
		}
		t.Logf("✓ Created diaper details")

		// Get
		retrieved, err := store.GetDiaperDetails(ctx, diaperActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get diaper details: %v", err)
		}
		if retrieved.ActivityID != diaperActivity.ID {
			t.Error("Activity ID mismatch")
		}
		if !retrieved.HadPoop || !retrieved.HadPee {
			t.Error("Diaper details mismatch")
		}
		t.Logf("✓ Retrieved diaper details: poop=%v pee=%v", retrieved.HadPoop, retrieved.HadPee)
	})

	// Test Sleep Details
	t.Run("SleepDetails", func(t *testing.T) {
		startTime := time.Now()

		sleepDetails := &domain.SleepDetails{
			ID:              uuid.New(),
			ActivityID:      sleepActivity.ID,
			StartTime:       startTime,
			EndTime:         nil, // Still sleeping
			DurationMinutes: nil,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		// Create
		err := store.CreateSleepDetails(ctx, sleepDetails)
		if err != nil {
			t.Fatalf("Failed to create sleep details: %v", err)
		}
		t.Logf("✓ Created sleep details")

		// Get
		retrieved, err := store.GetSleepDetails(ctx, sleepActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get sleep details: %v", err)
		}
		if retrieved.ActivityID != sleepActivity.ID {
			t.Error("Activity ID mismatch")
		}
		if retrieved.EndTime != nil {
			t.Error("Expected end_time to be nil (still sleeping)")
		}
		t.Logf("✓ Retrieved sleep details: active sleep")

		// Update (mark as complete)
		endTime := time.Now()
		durationMinutes := 90
		sleepDetails.EndTime = &endTime
		sleepDetails.DurationMinutes = &durationMinutes
		sleepDetails.UpdatedAt = time.Now()

		err = store.UpdateSleepDetails(ctx, sleepDetails)
		if err != nil {
			t.Fatalf("Failed to update sleep details: %v", err)
		}

		updated, _ := store.GetSleepDetails(ctx, sleepActivity.ID)
		if updated.EndTime == nil {
			t.Error("Expected end_time to be set after update")
		}
		if updated.DurationMinutes == nil || *updated.DurationMinutes != 90 {
			t.Error("Duration mismatch")
		}
		t.Logf("✓ Updated sleep details: %d minutes", *updated.DurationMinutes)
	})
}
