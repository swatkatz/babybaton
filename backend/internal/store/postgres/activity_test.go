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

	// Test GetLatestActivityByTypeForFamily — tested more thoroughly in dedicated test below
	t.Run("GetLatestActivityByTypeForFamily_Basic", func(t *testing.T) {
		// diaperActivity and sleepActivity still exist from CreateActivity test
		result, err := store.GetLatestActivityByTypeForFamily(ctx, family.ID, domain.ActivityTypeDiaper)
		if err != nil {
			t.Fatalf("Failed to get latest diaper activity: %v", err)
		}
		if result == nil {
			t.Fatal("Expected non-nil result for diaper activity")
		}
		if result.ID != diaperActivity.ID {
			t.Errorf("Expected activity ID %s, got %s", diaperActivity.ID, result.ID)
		}
		t.Logf("✓ Got latest diaper activity %s", result.ID)
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

func TestGetLatestActivityByTypeForFamily(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	// Create two families for scoping tests
	family1, caregiver1, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family 1: %v", err)
	}
	family2, caregiver2, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family 2: %v", err)
	}

	t.Cleanup(func() {
		store.DeleteFamily(ctx, family1.ID)
		store.DeleteFamily(ctx, family2.ID)
	})

	// Create sessions for each family
	session1 := &domain.CareSession{
		ID:          uuid.New(),
		CaregiverID: caregiver1.ID,
		FamilyID:    family1.ID,
		Status:      domain.StatusCompleted,
		StartedAt:   time.Now().Add(-2 * time.Hour),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	session1b := &domain.CareSession{
		ID:          uuid.New(),
		CaregiverID: caregiver1.ID,
		FamilyID:    family1.ID,
		Status:      domain.StatusInProgress,
		StartedAt:   time.Now().Add(-1 * time.Hour),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	session2 := &domain.CareSession{
		ID:          uuid.New(),
		CaregiverID: caregiver2.ID,
		FamilyID:    family2.ID,
		Status:      domain.StatusInProgress,
		StartedAt:   time.Now(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	for _, s := range []*domain.CareSession{session1, session1b, session2} {
		if err := store.CreateCareSession(ctx, s); err != nil {
			t.Fatalf("Failed to create session: %v", err)
		}
	}

	// Create activities: older feed in session1, newer feed in session1b
	olderFeed := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session1.ID,
		ActivityType:  domain.ActivityTypeFeed,
		CreatedAt:     time.Now().Add(-2 * time.Hour),
		UpdatedAt:     time.Now(),
	}
	newerFeed := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session1b.ID,
		ActivityType:  domain.ActivityTypeFeed,
		CreatedAt:     time.Now().Add(-30 * time.Minute),
		UpdatedAt:     time.Now(),
	}
	sleep1 := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session1.ID,
		ActivityType:  domain.ActivityTypeSleep,
		CreatedAt:     time.Now().Add(-1 * time.Hour),
		UpdatedAt:     time.Now(),
	}
	// Family 2's feed — should not be returned for family 1
	family2Feed := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session2.ID,
		ActivityType:  domain.ActivityTypeFeed,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	for _, a := range []*domain.Activity{olderFeed, newerFeed, sleep1, family2Feed} {
		if err := store.CreateActivity(ctx, a); err != nil {
			t.Fatalf("Failed to create activity: %v", err)
		}
	}

	t.Run("ReturnsLatestFeed", func(t *testing.T) {
		result, err := store.GetLatestActivityByTypeForFamily(ctx, family1.ID, domain.ActivityTypeFeed)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("Expected non-nil result")
		}
		if result.ID != newerFeed.ID {
			t.Errorf("Expected newer feed %s, got %s", newerFeed.ID, result.ID)
		}
	})

	t.Run("ReturnsLatestSleep", func(t *testing.T) {
		result, err := store.GetLatestActivityByTypeForFamily(ctx, family1.ID, domain.ActivityTypeSleep)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("Expected non-nil result")
		}
		if result.ID != sleep1.ID {
			t.Errorf("Expected sleep %s, got %s", sleep1.ID, result.ID)
		}
	})

	t.Run("ReturnsNilWhenNoActivitiesExist", func(t *testing.T) {
		// Create a family with no activities
		emptyFamily, _, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create empty family: %v", err)
		}
		t.Cleanup(func() { store.DeleteFamily(ctx, emptyFamily.ID) })

		result, err := store.GetLatestActivityByTypeForFamily(ctx, emptyFamily.ID, domain.ActivityTypeFeed)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("ReturnsNilForMissingType", func(t *testing.T) {
		// Family 1 has feeds and sleep, but no diaper
		result, err := store.GetLatestActivityByTypeForFamily(ctx, family1.ID, domain.ActivityTypeDiaper)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if result != nil {
			t.Errorf("Expected nil for missing type, got %v", result)
		}
	})

	t.Run("ScopedToFamily", func(t *testing.T) {
		// Family 2 should only see its own feed
		result, err := store.GetLatestActivityByTypeForFamily(ctx, family2.ID, domain.ActivityTypeFeed)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("Expected non-nil result for family 2")
		}
		if result.ID != family2Feed.ID {
			t.Errorf("Expected family2 feed %s, got %s", family2Feed.ID, result.ID)
		}

		// Family 2 should not see sleep (only family 1 has sleep)
		sleepResult, err := store.GetLatestActivityByTypeForFamily(ctx, family2.ID, domain.ActivityTypeSleep)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if sleepResult != nil {
			t.Errorf("Expected nil for family 2 sleep, got %v", sleepResult)
		}
	})
}
