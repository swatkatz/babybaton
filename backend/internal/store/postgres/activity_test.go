package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestActivityOperations(t *testing.T) {
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

	// Test data
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

	// Test CreateActivity
	t.Run("CreateActivity", func(t *testing.T) {
		err := store.CreateActivity(ctx, feedActivity)
		if err != nil {
			t.Fatalf("Failed to create feed activity: %v", err)
		}
		t.Logf("✓ Created feed activity %s", feedActivity.ID)

		err = store.CreateActivity(ctx, diaperActivity)
		if err != nil {
			t.Fatalf("Failed to create diaper activity: %v", err)
		}
		t.Logf("✓ Created diaper activity %s", diaperActivity.ID)

		err = store.CreateActivity(ctx, sleepActivity)
		if err != nil {
			t.Fatalf("Failed to create sleep activity: %v", err)
		}
		t.Logf("✓ Created sleep activity %s", sleepActivity.ID)
	})

	// Test GetActivitiesForSession
	t.Run("GetActivitiesForSession", func(t *testing.T) {
		activities, err := store.GetActivitiesForSession(ctx, session.ID)
		if err != nil {
			t.Fatalf("Failed to get activities for session: %v", err)
		}
		if len(activities) != 3 {
			t.Errorf("Expected 3 activities, got %d", len(activities))
		}

		// Check types
		types := make(map[domain.ActivityType]bool)
		for _, act := range activities {
			types[act.ActivityType] = true
		}
		if !types[domain.ActivityTypeFeed] || !types[domain.ActivityTypeDiaper] || !types[domain.ActivityTypeSleep] {
			t.Error("Not all activity types found")
		}

		t.Logf("✓ Retrieved %d activities for session", len(activities))
	})

	// Test DeleteActivity
	t.Run("DeleteActivity", func(t *testing.T) {
		err := store.DeleteActivity(ctx, feedActivity.ID)
		if err != nil {
			t.Fatalf("Failed to delete activity: %v", err)
		}

		// Verify deletion
		activities, _ := store.GetActivitiesForSession(ctx, session.ID)
		if len(activities) != 2 {
			t.Errorf("Expected 2 activities after deletion, got %d", len(activities))
		}

		t.Logf("✓ Deleted activity %s", feedActivity.ID)
	})
}
