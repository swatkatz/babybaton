package postgres

import (
	"context"
	"testing"

	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestScheduleGoals(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	family, _, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
	})

	t.Run("GetReturnsNilWhenNone", func(t *testing.T) {
		result, err := store.GetScheduleGoals(ctx, family.ID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != nil {
			t.Fatal("expected nil when no goals set")
		}
	})

	t.Run("UpsertCreatesNew", func(t *testing.T) {
		wakeWindow := 90
		feedInterval := 180
		napCount := 3
		maxNap := 120
		bedtime := "19:30"
		wakeTime := "07:00"

		goals := &domain.ScheduleGoals{
			TargetWakeWindowMinutes:   &wakeWindow,
			TargetFeedIntervalMinutes: &feedInterval,
			TargetNapCount:            &napCount,
			MaxDaytimeNapMinutes:      &maxNap,
			TargetBedtime:             &bedtime,
			TargetWakeTime:            &wakeTime,
		}

		result, err := store.UpsertScheduleGoals(ctx, family.ID, goals)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.FamilyID != family.ID {
			t.Errorf("FamilyID = %v, want %v", result.FamilyID, family.ID)
		}
		if *result.TargetWakeWindowMinutes != 90 {
			t.Errorf("TargetWakeWindowMinutes = %v, want 90", *result.TargetWakeWindowMinutes)
		}
		if *result.TargetFeedIntervalMinutes != 180 {
			t.Errorf("TargetFeedIntervalMinutes = %v, want 180", *result.TargetFeedIntervalMinutes)
		}
		if *result.TargetNapCount != 3 {
			t.Errorf("TargetNapCount = %v, want 3", *result.TargetNapCount)
		}
		if *result.MaxDaytimeNapMinutes != 120 {
			t.Errorf("MaxDaytimeNapMinutes = %v, want 120", *result.MaxDaytimeNapMinutes)
		}
		if *result.TargetBedtime != "19:30" {
			t.Errorf("TargetBedtime = %v, want 19:30", *result.TargetBedtime)
		}
		if *result.TargetWakeTime != "07:00" {
			t.Errorf("TargetWakeTime = %v, want 07:00", *result.TargetWakeTime)
		}

		// Verify via Get
		retrieved, err := store.GetScheduleGoals(ctx, family.ID)
		if err != nil {
			t.Fatalf("unexpected error on get: %v", err)
		}
		if retrieved == nil {
			t.Fatal("expected non-nil result")
		}
		if *retrieved.TargetWakeWindowMinutes != 90 {
			t.Errorf("Get TargetWakeWindowMinutes = %v, want 90", *retrieved.TargetWakeWindowMinutes)
		}
	})

	t.Run("UpsertUpdatesExisting", func(t *testing.T) {
		newWakeWindow := 120
		goals := &domain.ScheduleGoals{
			TargetWakeWindowMinutes: &newWakeWindow,
		}

		result, err := store.UpsertScheduleGoals(ctx, family.ID, goals)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// Updated field
		if *result.TargetWakeWindowMinutes != 120 {
			t.Errorf("TargetWakeWindowMinutes = %v, want 120", *result.TargetWakeWindowMinutes)
		}
		// Preserved field from previous upsert (COALESCE keeps old value)
		if *result.TargetFeedIntervalMinutes != 180 {
			t.Errorf("TargetFeedIntervalMinutes = %v, want 180 (preserved)", *result.TargetFeedIntervalMinutes)
		}
	})

	t.Run("PartialFields", func(t *testing.T) {
		// Create a new family for this test
		family2, _, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create test family: %v", err)
		}
		t.Cleanup(func() {
			store.DeleteFamily(ctx, family2.ID)
		})

		napCount := 2
		goals := &domain.ScheduleGoals{
			TargetNapCount: &napCount,
		}

		result, err := store.UpsertScheduleGoals(ctx, family2.ID, goals)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if *result.TargetNapCount != 2 {
			t.Errorf("TargetNapCount = %v, want 2", *result.TargetNapCount)
		}
		if result.TargetWakeWindowMinutes != nil {
			t.Errorf("TargetWakeWindowMinutes = %v, want nil", *result.TargetWakeWindowMinutes)
		}
		if result.TargetBedtime != nil {
			t.Errorf("TargetBedtime = %v, want nil", *result.TargetBedtime)
		}
	})

	t.Run("ScopedToFamily", func(t *testing.T) {
		family2, _, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create second family: %v", err)
		}
		t.Cleanup(func() {
			store.DeleteFamily(ctx, family2.ID)
		})

		napCount := 4
		goals := &domain.ScheduleGoals{
			TargetNapCount: &napCount,
		}
		_, err = store.UpsertScheduleGoals(ctx, family2.ID, goals)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Family 1 should still have its own goals (from earlier tests)
		result1, err := store.GetScheduleGoals(ctx, family.ID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		result2, err := store.GetScheduleGoals(ctx, family2.ID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result1 == nil || result2 == nil {
			t.Fatal("both families should have goals")
		}
		if *result1.TargetWakeWindowMinutes != 120 {
			t.Errorf("Family1 TargetWakeWindowMinutes = %v, want 120", *result1.TargetWakeWindowMinutes)
		}
		if *result2.TargetNapCount != 4 {
			t.Errorf("Family2 TargetNapCount = %v, want 4", *result2.TargetNapCount)
		}
	})

	t.Run("CascadeDelete", func(t *testing.T) {
		family3, _, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create family: %v", err)
		}

		napCount := 1
		_, err = store.UpsertScheduleGoals(ctx, family3.ID, &domain.ScheduleGoals{
			TargetNapCount: &napCount,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Delete family
		err = store.DeleteFamily(ctx, family3.ID)
		if err != nil {
			t.Fatalf("unexpected error deleting family: %v", err)
		}

		// Goals should be gone
		result, err := store.GetScheduleGoals(ctx, family3.ID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != nil {
			t.Fatal("expected nil after cascade delete")
		}
	})
}
