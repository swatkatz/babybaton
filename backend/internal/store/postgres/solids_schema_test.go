package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestSolidsSchema(t *testing.T) {
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

	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
	})

	// Create test session
	session := &domain.CareSession{
		ID:          uuid.New(),
		CaregiverID: caregiver.ID,
		FamilyID:    family.ID,
		Status:      domain.StatusInProgress,
		StartedAt:   time.Now(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	err = store.CreateCareSession(ctx, session)
	if err != nil {
		t.Fatalf("Failed to create test session: %v", err)
	}

	// Create feed activity
	feedActivity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: session.ID,
		ActivityType:  domain.ActivityTypeFeed,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	err = store.CreateActivity(ctx, feedActivity)
	if err != nil {
		t.Fatalf("Failed to create feed activity: %v", err)
	}

	t.Run("InsertSolidsFeedType", func(t *testing.T) {
		// Insert a feed_details row with feed_type='solids' — should succeed after migration
		feedType := domain.FeedTypeSolids
		feedDetails := &domain.FeedDetails{
			ID:         uuid.New(),
			ActivityID: feedActivity.ID,
			StartTime:  time.Now(),
			FeedType:   &feedType,
			FoodName:   stringPtr("carrots"),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		err := store.CreateFeedDetails(ctx, feedDetails)
		if err != nil {
			t.Fatalf("Failed to insert solids feed: %v", err)
		}

		// Retrieve and verify
		retrieved, err := store.GetFeedDetails(ctx, feedActivity.ID)
		if err != nil {
			t.Fatalf("Failed to get feed details: %v", err)
		}
		if retrieved.FeedType == nil || *retrieved.FeedType != domain.FeedTypeSolids {
			t.Errorf("Expected feed type 'solids', got %v", retrieved.FeedType)
		}
		if retrieved.FoodName == nil || *retrieved.FoodName != "carrots" {
			t.Errorf("Expected food_name 'carrots', got %v", retrieved.FoodName)
		}
		t.Logf("✓ Inserted and retrieved solids feed: food_name=%s", *retrieved.FoodName)
	})

	t.Run("InsertSolidsWithQuantity", func(t *testing.T) {
		// Create another feed activity for this test
		feedActivity2 := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		err := store.CreateActivity(ctx, feedActivity2)
		if err != nil {
			t.Fatalf("Failed to create feed activity: %v", err)
		}

		feedType := domain.FeedTypeSolids
		quantity := 10.0
		quantityUnit := "spoons"
		feedDetails := &domain.FeedDetails{
			ID:           uuid.New(),
			ActivityID:   feedActivity2.ID,
			StartTime:    time.Now(),
			FeedType:     &feedType,
			FoodName:     stringPtr("mushed carrots"),
			Quantity:     &quantity,
			QuantityUnit: &quantityUnit,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		err = store.CreateFeedDetails(ctx, feedDetails)
		if err != nil {
			t.Fatalf("Failed to insert solids feed with quantity: %v", err)
		}

		retrieved, err := store.GetFeedDetails(ctx, feedActivity2.ID)
		if err != nil {
			t.Fatalf("Failed to get feed details: %v", err)
		}
		if retrieved.Quantity == nil || *retrieved.Quantity != 10.0 {
			t.Errorf("Expected quantity 10, got %v", retrieved.Quantity)
		}
		if retrieved.QuantityUnit == nil || *retrieved.QuantityUnit != "spoons" {
			t.Errorf("Expected quantity_unit 'spoons', got %v", retrieved.QuantityUnit)
		}
		t.Logf("✓ Inserted solids with quantity: %.0f %s of %s", *retrieved.Quantity, *retrieved.QuantityUnit, *retrieved.FoodName)
	})

	t.Run("NegativeQuantityFails", func(t *testing.T) {
		feedActivity3 := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		store.CreateActivity(ctx, feedActivity3)

		feedType := domain.FeedTypeSolids
		negativeQuantity := -1.0
		feedDetails := &domain.FeedDetails{
			ID:         uuid.New(),
			ActivityID: feedActivity3.ID,
			StartTime:  time.Now(),
			FeedType:   &feedType,
			FoodName:   stringPtr("banana"),
			Quantity:   &negativeQuantity,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		err := store.CreateFeedDetails(ctx, feedDetails)
		if err == nil {
			t.Fatal("Expected error for negative quantity, but insert succeeded")
		}
		t.Logf("✓ Negative quantity correctly rejected: %v", err)
	})

	t.Run("InvalidQuantityUnitFails", func(t *testing.T) {
		feedActivity4 := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		store.CreateActivity(ctx, feedActivity4)

		feedType := domain.FeedTypeSolids
		quantity := 1.0
		invalidUnit := "cups"
		feedDetails := &domain.FeedDetails{
			ID:           uuid.New(),
			ActivityID:   feedActivity4.ID,
			StartTime:    time.Now(),
			FeedType:     &feedType,
			FoodName:     stringPtr("yogurt"),
			Quantity:     &quantity,
			QuantityUnit: &invalidUnit,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		err := store.CreateFeedDetails(ctx, feedDetails)
		if err == nil {
			t.Fatal("Expected error for invalid quantity_unit 'cups', but insert succeeded")
		}
		t.Logf("✓ Invalid quantity_unit correctly rejected: %v", err)
	})

	t.Run("FormulaFeedStillWorks", func(t *testing.T) {
		feedActivity5 := &domain.Activity{
			ID:            uuid.New(),
			CareSessionID: session.ID,
			ActivityType:  domain.ActivityTypeFeed,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		store.CreateActivity(ctx, feedActivity5)

		feedType := domain.FeedTypeFormula
		amountMl := 120
		feedDetails := &domain.FeedDetails{
			ID:         uuid.New(),
			ActivityID: feedActivity5.ID,
			StartTime:  time.Now(),
			FeedType:   &feedType,
			AmountMl:   &amountMl,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		err := store.CreateFeedDetails(ctx, feedDetails)
		if err != nil {
			t.Fatalf("Failed to insert formula feed (regression): %v", err)
		}

		retrieved, err := store.GetFeedDetails(ctx, feedActivity5.ID)
		if err != nil {
			t.Fatalf("Failed to get formula feed details: %v", err)
		}
		if retrieved.AmountMl == nil || *retrieved.AmountMl != 120 {
			t.Errorf("Expected amount_ml 120, got %v", retrieved.AmountMl)
		}
		t.Logf("✓ Formula feed still works: %dml", *retrieved.AmountMl)
	})
}
