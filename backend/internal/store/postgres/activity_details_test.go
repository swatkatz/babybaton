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

		// Update
		newAmount := 200
		newFeedType := domain.FeedTypeBreastMilk
		newStartTime := startTime.Add(-10 * time.Minute)
		feedDetails.StartTime = newStartTime
		feedDetails.AmountMl = &newAmount
		feedDetails.FeedType = &newFeedType
		feedDetails.UpdatedAt = time.Now()

		err = store.UpdateFeedDetails(ctx, feedDetails)
		if err != nil {
			t.Fatalf("Failed to update feed details: %v", err)
		}

		updated, err := store.GetFeedDetails(ctx, feedActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get updated feed details: %v", err)
		}
		if updated.AmountMl == nil || *updated.AmountMl != 200 {
			t.Errorf("Expected amount 200, got %v", updated.AmountMl)
		}
		if updated.FeedType == nil || *updated.FeedType != domain.FeedTypeBreastMilk {
			t.Errorf("Expected feed type breast_milk, got %v", updated.FeedType)
		}
		t.Logf("✓ Updated feed details: %dml %s", *updated.AmountMl, *updated.FeedType)
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

		// Update
		diaperDetails.HadPoop = false
		diaperDetails.HadPee = true
		diaperDetails.ChangedAt = time.Now()
		diaperDetails.UpdatedAt = time.Now()

		err = store.UpdateDiaperDetails(ctx, diaperDetails)
		if err != nil {
			t.Fatalf("Failed to update diaper details: %v", err)
		}

		updated, err := store.GetDiaperDetails(ctx, diaperActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get updated diaper details: %v", err)
		}
		if updated.HadPoop {
			t.Error("Expected hadPoop to be false after update")
		}
		if !updated.HadPee {
			t.Error("Expected hadPee to be true after update")
		}
		t.Logf("✓ Updated diaper details: poop=%v pee=%v", updated.HadPoop, updated.HadPee)
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

		// Update start_time (extended behavior)
		newStartTime := startTime.Add(-30 * time.Minute)
		sleepDetails.StartTime = newStartTime
		durationMinutes = 120
		sleepDetails.DurationMinutes = &durationMinutes
		sleepDetails.UpdatedAt = time.Now()

		err = store.UpdateSleepDetails(ctx, sleepDetails)
		if err != nil {
			t.Fatalf("Failed to update sleep start_time: %v", err)
		}

		updatedAgain, _ := store.GetSleepDetails(ctx, sleepActivity.ID)
		if updatedAgain.DurationMinutes == nil || *updatedAgain.DurationMinutes != 120 {
			t.Errorf("Expected duration 120 after start_time update, got %v", updatedAgain.DurationMinutes)
		}
		t.Logf("✓ Updated sleep start_time: %d minutes", *updatedAgain.DurationMinutes)
	})

	// Test Solids Feed Details
	t.Run("CreateFeedDetails_Solids", func(t *testing.T) {
		solidsActivity := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		if err := store.CreateActivity(ctx, solidsActivity); err != nil {
			t.Fatalf("Failed to create solids activity: %v", err)
		}

		startTime := time.Now()
		feedType := domain.FeedTypeSolids
		foodName := "mushed carrots"
		quantity := 10.0
		quantityUnit := "spoons"

		solidsDetails := &domain.FeedDetails{
			ID:           uuid.New(),
			ActivityID:   solidsActivity.ID,
			StartTime:    startTime,
			FeedType:     &feedType,
			FoodName:     &foodName,
			Quantity:     &quantity,
			QuantityUnit: &quantityUnit,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		err := store.CreateFeedDetails(ctx, solidsDetails)
		if err != nil {
			t.Fatalf("Failed to create solids feed details: %v", err)
		}

		retrieved, err := store.GetFeedDetails(ctx, solidsActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get solids feed details: %v", err)
		}
		if retrieved.FeedType == nil || *retrieved.FeedType != domain.FeedTypeSolids {
			t.Errorf("Expected feed type solids, got %v", retrieved.FeedType)
		}
		if retrieved.FoodName == nil || *retrieved.FoodName != "mushed carrots" {
			t.Errorf("Expected food name 'mushed carrots', got %v", retrieved.FoodName)
		}
		if retrieved.Quantity == nil || *retrieved.Quantity != 10.0 {
			t.Errorf("Expected quantity 10, got %v", retrieved.Quantity)
		}
		if retrieved.QuantityUnit == nil || *retrieved.QuantityUnit != "spoons" {
			t.Errorf("Expected quantity unit 'spoons', got %v", retrieved.QuantityUnit)
		}
		if retrieved.AmountMl != nil {
			t.Errorf("Expected amount_ml to be nil for solids, got %v", retrieved.AmountMl)
		}
		t.Logf("✓ Created and retrieved solids feed: %s (%v %s)", *retrieved.FoodName, *retrieved.Quantity, *retrieved.QuantityUnit)
	})

	// Test Solids Feed Details with minimal fields (food name only)
	t.Run("CreateFeedDetails_Solids_MinimalFields", func(t *testing.T) {
		minimalActivity := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		if err := store.CreateActivity(ctx, minimalActivity); err != nil {
			t.Fatalf("Failed to create minimal solids activity: %v", err)
		}

		startTime := time.Now()
		feedType := domain.FeedTypeSolids
		foodName := "avocado"

		minimalDetails := &domain.FeedDetails{
			ID:         uuid.New(),
			ActivityID: minimalActivity.ID,
			StartTime:  startTime,
			FeedType:   &feedType,
			FoodName:   &foodName,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		err := store.CreateFeedDetails(ctx, minimalDetails)
		if err != nil {
			t.Fatalf("Failed to create minimal solids feed details: %v", err)
		}

		retrieved, err := store.GetFeedDetails(ctx, minimalActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get minimal solids feed details: %v", err)
		}
		if retrieved.FoodName == nil || *retrieved.FoodName != "avocado" {
			t.Errorf("Expected food name 'avocado', got %v", retrieved.FoodName)
		}
		if retrieved.Quantity != nil {
			t.Errorf("Expected quantity to be nil, got %v", retrieved.Quantity)
		}
		if retrieved.QuantityUnit != nil {
			t.Errorf("Expected quantity unit to be nil, got %v", retrieved.QuantityUnit)
		}
		t.Logf("✓ Created and retrieved minimal solids feed: %s (no quantity)", *retrieved.FoodName)
	})

	// Regression: Formula feed still works unchanged
	t.Run("CreateFeedDetails_Formula_Unchanged", func(t *testing.T) {
		formulaActivity := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		if err := store.CreateActivity(ctx, formulaActivity); err != nil {
			t.Fatalf("Failed to create formula activity: %v", err)
		}

		startTime := time.Now()
		endTime := startTime.Add(15 * time.Minute)
		amountMl := 150
		feedType := domain.FeedTypeFormula

		formulaDetails := &domain.FeedDetails{
			ID:         uuid.New(),
			ActivityID: formulaActivity.ID,
			StartTime:  startTime,
			EndTime:    &endTime,
			AmountMl:   &amountMl,
			FeedType:   &feedType,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		err := store.CreateFeedDetails(ctx, formulaDetails)
		if err != nil {
			t.Fatalf("Failed to create formula feed details: %v", err)
		}

		retrieved, err := store.GetFeedDetails(ctx, formulaActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get formula feed details: %v", err)
		}
		if retrieved.FeedType == nil || *retrieved.FeedType != domain.FeedTypeFormula {
			t.Errorf("Expected feed type formula, got %v", retrieved.FeedType)
		}
		if retrieved.AmountMl == nil || *retrieved.AmountMl != 150 {
			t.Errorf("Expected amount 150ml, got %v", retrieved.AmountMl)
		}
		if retrieved.FoodName != nil {
			t.Errorf("Expected food name to be nil for formula, got %v", retrieved.FoodName)
		}
		if retrieved.Quantity != nil {
			t.Errorf("Expected quantity to be nil for formula, got %v", retrieved.Quantity)
		}
		if retrieved.QuantityUnit != nil {
			t.Errorf("Expected quantity unit to be nil for formula, got %v", retrieved.QuantityUnit)
		}
		t.Logf("✓ Formula feed unchanged: %dml %s", *retrieved.AmountMl, *retrieved.FeedType)
	})
}
