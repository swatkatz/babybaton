package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestFamilyOperations(t *testing.T) {
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

	// Test CreateFamilyWithCaregiver
	t.Run("CreateFamilyWithCaregiver", func(t *testing.T) {
		// Already created above, just verify it exists
		retrieved, err := store.GetFamilyByID(ctx, family.ID)
		if err != nil {
			t.Fatalf("Failed to get family: %v", err)
		}
		t.Logf("✓ Created family %s with caregiver %s", retrieved.ID, caregiver.ID)
	})

	// Test FamilyNameExists
	t.Run("FamilyNameExists", func(t *testing.T) {
		exists, err := store.FamilyNameExists(ctx, family.Name)
		if err != nil {
			t.Fatalf("Failed to check name: %v", err)
		}
		if !exists {
			t.Error("Expected family to exist")
		}
		
		exists, err = store.FamilyNameExists(ctx, "Nonexistent Family " + uuid.New().String())
		if err != nil {
			t.Fatalf("Failed to check name: %v", err)
		}
		if exists {
			t.Error("Expected family to not exist")
		}
		
		t.Logf("✓ FamilyNameExists works correctly")
	})

	// Test GetFamilyByName (case-insensitive)
	t.Run("GetFamilyByName", func(t *testing.T) {
		retrieved, err := store.GetFamilyByName(ctx, family.Name)
		if err != nil {
			t.Fatalf("Failed to get family: %v", err)
		}
		if retrieved.Name != family.Name {
			t.Errorf("Expected '%s', got '%s'", family.Name, retrieved.Name)
		}
		
		t.Logf("✓ Retrieved family: %s", retrieved.Name)
	})

	// Test GetFamilyByID
	t.Run("GetFamilyByID", func(t *testing.T) {
		retrieved, err := store.GetFamilyByID(ctx, family.ID)
		if err != nil {
			t.Fatalf("Failed to get family by ID: %v", err)
		}
		if retrieved.ID != family.ID {
			t.Error("Family ID mismatch")
		}
		
		t.Logf("✓ Retrieved family by ID: %s", retrieved.ID)
	})

	// Test UpdateFamily
	t.Run("UpdateFamily", func(t *testing.T) {
		family.BabyName = "Updated Baby Name"
		family.UpdatedAt = time.Now()
		
		err := store.UpdateFamily(ctx, family)
		if err != nil {
			t.Fatalf("Failed to update family: %v", err)
		}
		
		updated, _ := store.GetFamilyByID(ctx, family.ID)
		if updated.BabyName != "Updated Baby Name" {
			t.Errorf("Expected 'Updated Baby Name', got '%s'", updated.BabyName)
		}
		
		t.Logf("✓ Updated baby name to: %s", updated.BabyName)
	})
}