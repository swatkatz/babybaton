package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestCaregiverOperations(t *testing.T) {
	// Connect to TEST database
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	// Create unique test family using helper
	family, _, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family: %v", err)
	}

	// Cleanup at the END of all subtests
	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
		t.Logf("✓ Cleaned up test family %s", family.ID)
	})

	// Test data for additional caregiver
	caregiver := &domain.Caregiver{
		ID:         uuid.New(),
		FamilyID:   family.ID,
		Name:       "Test Dad",
		DeviceID:   "test-device-" + uuid.New().String()[:8],
		DeviceName: stringPtr("Test Android"),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// Test CreateCaregiver
	t.Run("CreateCaregiver", func(t *testing.T) {
		err := store.CreateCaregiver(ctx, caregiver)
		if err != nil {
			t.Fatalf("Failed to create caregiver: %v", err)
		}
		t.Logf("✓ Created caregiver %s", caregiver.ID)
	})

	// Test GetCaregiverByID
	t.Run("GetCaregiverByID", func(t *testing.T) {
		retrieved, err := store.GetCaregiverByID(ctx, caregiver.ID)
		if err != nil {
			t.Fatalf("Failed to get caregiver by ID: %v", err)
		}
		if retrieved.ID != caregiver.ID {
			t.Error("Caregiver ID mismatch")
		}
		if retrieved.Name != "Test Dad" {
			t.Errorf("Expected 'Test Dad', got '%s'", retrieved.Name)
		}
		t.Logf("✓ Retrieved caregiver by ID: %s", retrieved.ID)
	})

	// Test GetCaregiverByDeviceID
	t.Run("GetCaregiverByDeviceID", func(t *testing.T) {
		retrieved, err := store.GetCaregiverByDeviceID(ctx, caregiver.DeviceID)
		if err != nil {
			t.Fatalf("Failed to get caregiver by device ID: %v", err)
		}
		if retrieved.DeviceID != caregiver.DeviceID {
			t.Error("Device ID mismatch")
		}
		t.Logf("✓ Retrieved caregiver by device ID: %s", retrieved.DeviceID)
	})

	// Test GetCaregiversByFamily
	t.Run("GetCaregiversByFamily", func(t *testing.T) {
		caregivers, err := store.GetCaregiversByFamily(ctx, family.ID)
		if err != nil {
			t.Fatalf("Failed to get caregivers by family: %v", err)
		}
		if len(caregivers) != 2 { // initial + test caregiver
			t.Errorf("Expected 2 caregivers, got %d", len(caregivers))
		}
		t.Logf("✓ Retrieved %d caregivers for family", len(caregivers))
	})

	// Test UpdateCaregiver
	t.Run("UpdateCaregiver", func(t *testing.T) {
		caregiver.Name = "Updated Dad Name"
		caregiver.UpdatedAt = time.Now()

		err := store.UpdateCaregiver(ctx, caregiver)
		if err != nil {
			t.Fatalf("Failed to update caregiver: %v", err)
		}

		updated, _ := store.GetCaregiverByID(ctx, caregiver.ID)
		if updated.Name != "Updated Dad Name" {
			t.Errorf("Expected 'Updated Dad Name', got '%s'", updated.Name)
		}

		t.Logf("✓ Updated caregiver name to: %s", updated.Name)
	})

	// Test DeleteCaregiver
	t.Run("DeleteCaregiver", func(t *testing.T) {
		err := store.DeleteCaregiver(ctx, caregiver.ID)
		if err != nil {
			t.Fatalf("Failed to delete caregiver: %v", err)
		}

		// Verify deletion
		_, err = store.GetCaregiverByID(ctx, caregiver.ID)
		if err == nil {
			t.Error("Expected error when getting deleted caregiver")
		}

		t.Logf("✓ Deleted caregiver %s", caregiver.ID)
	})
}
