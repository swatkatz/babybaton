package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
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

	// Test GetFamiliesByUserID
	t.Run("GetFamiliesByUserID", func(t *testing.T) {
		// Create a user
		now := time.Now()
		user := &domain.User{
			ID:             uuid.New(),
			SupabaseUserID: "supabase-fam-" + uuid.New().String()[:8],
			Email:          "fam-test-" + uuid.New().String()[:8] + "@example.com",
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		err := store.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
		t.Cleanup(func() {
			store.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", user.ID)
		})

		// Link the test family's caregiver to the user
		err = store.LinkCaregiverToUser(ctx, caregiver.ID, user.ID)
		if err != nil {
			t.Fatalf("Failed to link caregiver to user: %v", err)
		}

		// Create a second family with this user
		family2, _, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create second family: %v", err)
		}
		t.Cleanup(func() {
			store.DeleteFamily(ctx, family2.ID)
		})

		// Create a caregiver for user in family2
		cg2 := &domain.Caregiver{
			ID:        uuid.New(),
			FamilyID:  family2.ID,
			UserID:    &user.ID,
			Name:      "User in Family2",
			CreatedAt: now,
			UpdatedAt: now,
		}
		err = store.CreateCaregiver(ctx, cg2)
		if err != nil {
			t.Fatalf("Failed to create caregiver in second family: %v", err)
		}

		// Now query families by user
		families, err := store.GetFamiliesByUserID(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get families by user: %v", err)
		}
		if len(families) != 2 {
			t.Fatalf("Expected 2 families, got %d", len(families))
		}

		t.Logf("✓ GetFamiliesByUserID returned %d families", len(families))

		// Test with user that has no families
		noFamilyUser := &domain.User{
			ID:             uuid.New(),
			SupabaseUserID: "supabase-nofam-" + uuid.New().String()[:8],
			Email:          "nofam-" + uuid.New().String()[:8] + "@example.com",
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		err = store.CreateUser(ctx, noFamilyUser)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
		t.Cleanup(func() {
			store.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", noFamilyUser.ID)
		})

		emptyFamilies, err := store.GetFamiliesByUserID(ctx, noFamilyUser.ID)
		if err != nil {
			t.Fatalf("Failed to get families for user with no families: %v", err)
		}
		if len(emptyFamilies) != 0 {
			t.Errorf("Expected 0 families, got %d", len(emptyFamilies))
		}

		t.Logf("✓ GetFamiliesByUserID correctly returns empty for user with no families")
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