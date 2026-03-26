package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestUserOperations(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	now := time.Now()
	user := &domain.User{
		ID:             uuid.New(),
		SupabaseUserID: "supabase-" + uuid.New().String()[:8],
		Email:          "test-" + uuid.New().String()[:8] + "@example.com",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Test CreateUser
	t.Run("CreateUser", func(t *testing.T) {
		err := store.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
		t.Logf("✓ Created user %s", user.ID)
	})

	t.Cleanup(func() {
		store.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", user.ID)
		t.Logf("✓ Cleaned up test user %s", user.ID)
	})

	// Test GetUserBySupabaseID
	t.Run("GetUserBySupabaseID", func(t *testing.T) {
		retrieved, err := store.GetUserBySupabaseID(ctx, user.SupabaseUserID)
		if err != nil {
			t.Fatalf("Failed to get user by supabase ID: %v", err)
		}
		if retrieved.ID != user.ID {
			t.Error("User ID mismatch")
		}
		if retrieved.Email != user.Email {
			t.Errorf("Expected email %q, got %q", user.Email, retrieved.Email)
		}
		t.Logf("✓ Retrieved user by supabase ID: %s", retrieved.SupabaseUserID)
	})

	// Test GetUserByID
	t.Run("GetUserByID", func(t *testing.T) {
		retrieved, err := store.GetUserByID(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get user by ID: %v", err)
		}
		if retrieved.SupabaseUserID != user.SupabaseUserID {
			t.Errorf("Expected supabase ID %q, got %q", user.SupabaseUserID, retrieved.SupabaseUserID)
		}
		t.Logf("✓ Retrieved user by ID: %s", retrieved.ID)
	})

	// Test GetUserBySupabaseID not found
	t.Run("GetUserBySupabaseID_NotFound", func(t *testing.T) {
		_, err := store.GetUserBySupabaseID(ctx, "nonexistent-supabase-id")
		if err == nil {
			t.Error("Expected error when getting nonexistent user")
		}
		t.Logf("✓ Correctly returned error for nonexistent supabase ID")
	})

	// Test duplicate supabase_user_id
	t.Run("CreateUser_DuplicateSupabaseID", func(t *testing.T) {
		duplicate := &domain.User{
			ID:             uuid.New(),
			SupabaseUserID: user.SupabaseUserID,
			Email:          "other@example.com",
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		err := store.CreateUser(ctx, duplicate)
		if err == nil {
			t.Error("Expected error when creating user with duplicate supabase ID")
			// Clean up if it somehow succeeded
			store.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", duplicate.ID)
		}
		t.Logf("✓ Correctly rejected duplicate supabase ID")
	})
}

func TestCaregiverWithUser(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	// Create a test family
	family, _, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
		t.Logf("✓ Cleaned up test family %s", family.ID)
	})

	// Create a test user
	now := time.Now()
	user := &domain.User{
		ID:             uuid.New(),
		SupabaseUserID: "supabase-" + uuid.New().String()[:8],
		Email:          "test-" + uuid.New().String()[:8] + "@example.com",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	err = store.CreateUser(ctx, user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}
	t.Cleanup(func() {
		store.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", user.ID)
	})

	// Test creating a caregiver with user_id (no device_id)
	t.Run("CreateCaregiverWithUserID", func(t *testing.T) {
		caregiver := &domain.Caregiver{
			ID:        uuid.New(),
			FamilyID:  family.ID,
			UserID:    &user.ID,
			Name:      "User-Based Caregiver",
			DeviceID:  nil,
			CreatedAt: now,
			UpdatedAt: now,
		}

		err := store.CreateCaregiver(ctx, caregiver)
		if err != nil {
			t.Fatalf("Failed to create caregiver with user_id: %v", err)
		}

		// Verify it can be retrieved
		retrieved, err := store.GetCaregiverByID(ctx, caregiver.ID)
		if err != nil {
			t.Fatalf("Failed to get caregiver: %v", err)
		}
		if retrieved.UserID == nil || *retrieved.UserID != user.ID {
			t.Error("UserID mismatch")
		}
		if retrieved.DeviceID != nil {
			t.Error("Expected nil DeviceID for user-based caregiver")
		}

		t.Logf("✓ Created and verified user-based caregiver")

		// Clean up
		store.DeleteCaregiver(ctx, caregiver.ID)
	})

	// Test LinkCaregiverToUser
	t.Run("LinkCaregiverToUser", func(t *testing.T) {
		deviceID := "link-test-device-" + uuid.New().String()[:8]
		caregiver := &domain.Caregiver{
			ID:        uuid.New(),
			FamilyID:  family.ID,
			Name:      "Device Caregiver",
			DeviceID:  &deviceID,
			CreatedAt: now,
			UpdatedAt: now,
		}

		err := store.CreateCaregiver(ctx, caregiver)
		if err != nil {
			t.Fatalf("Failed to create caregiver: %v", err)
		}

		// Link to user
		err = store.LinkCaregiverToUser(ctx, caregiver.ID, user.ID)
		if err != nil {
			t.Fatalf("Failed to link caregiver to user: %v", err)
		}

		// Verify link
		retrieved, err := store.GetCaregiverByID(ctx, caregiver.ID)
		if err != nil {
			t.Fatalf("Failed to get caregiver: %v", err)
		}
		if retrieved.UserID == nil || *retrieved.UserID != user.ID {
			t.Error("Expected caregiver to be linked to user")
		}

		t.Logf("✓ Linked caregiver to user")

		// Clean up
		store.DeleteCaregiver(ctx, caregiver.ID)
	})

	// Test GetCaregiverByUserAndFamily
	t.Run("GetCaregiverByUserAndFamily", func(t *testing.T) {
		caregiver := &domain.Caregiver{
			ID:        uuid.New(),
			FamilyID:  family.ID,
			UserID:    &user.ID,
			Name:      "User Family Caregiver",
			DeviceID:  nil,
			CreatedAt: now,
			UpdatedAt: now,
		}

		err := store.CreateCaregiver(ctx, caregiver)
		if err != nil {
			t.Fatalf("Failed to create caregiver: %v", err)
		}

		retrieved, err := store.GetCaregiverByUserAndFamily(ctx, user.ID, family.ID)
		if err != nil {
			t.Fatalf("Failed to get caregiver by user and family: %v", err)
		}
		if retrieved.ID != caregiver.ID {
			t.Error("Caregiver ID mismatch")
		}

		t.Logf("✓ Retrieved caregiver by user and family")

		// Clean up
		store.DeleteCaregiver(ctx, caregiver.ID)
	})

	// Test UNIQUE(user_id, family_id) constraint
	t.Run("UniqueUserFamilyConstraint", func(t *testing.T) {
		caregiver1 := &domain.Caregiver{
			ID:        uuid.New(),
			FamilyID:  family.ID,
			UserID:    &user.ID,
			Name:      "First Caregiver",
			DeviceID:  nil,
			CreatedAt: now,
			UpdatedAt: now,
		}

		err := store.CreateCaregiver(ctx, caregiver1)
		if err != nil {
			t.Fatalf("Failed to create first caregiver: %v", err)
		}

		// Try to create a second caregiver with same user_id + family_id
		caregiver2 := &domain.Caregiver{
			ID:        uuid.New(),
			FamilyID:  family.ID,
			UserID:    &user.ID,
			Name:      "Second Caregiver",
			DeviceID:  nil,
			CreatedAt: now,
			UpdatedAt: now,
		}

		err = store.CreateCaregiver(ctx, caregiver2)
		if err == nil {
			t.Error("Expected error when creating duplicate user+family caregiver")
			store.DeleteCaregiver(ctx, caregiver2.ID)
		}

		t.Logf("✓ Correctly rejected duplicate user+family caregiver")

		// Clean up
		store.DeleteCaregiver(ctx, caregiver1.ID)
	})
}
