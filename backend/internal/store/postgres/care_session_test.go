package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestCareSessionOperations(t *testing.T) {
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

	// Test data
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

	// Test CreateCareSession
	t.Run("CreateCareSession", func(t *testing.T) {
		err := store.CreateCareSession(ctx, session)
		if err != nil {
			t.Fatalf("Failed to create care session: %v", err)
		}
		t.Logf("✓ Created care session %s", session.ID)
	})

	// Test GetCareSessionByID
	t.Run("GetCareSessionByID", func(t *testing.T) {
		retrieved, err := store.GetCareSessionByID(ctx, session.ID)
		if err != nil {
			t.Fatalf("Failed to get care session by ID: %v", err)
		}
		if retrieved.ID != session.ID {
			t.Error("Session ID mismatch")
		}
		if retrieved.Status != domain.StatusInProgress {
			t.Errorf("Expected status 'in_progress', got '%s'", retrieved.Status)
		}
		t.Logf("✓ Retrieved care session by ID: %s", retrieved.ID)
	})

	// Test GetInProgressSessionForFamily
	t.Run("GetInProgressSessionForFamily", func(t *testing.T) {
		retrieved, err := store.GetInProgressSessionForFamily(ctx, family.ID)
		if err != nil {
			t.Fatalf("Failed to get in-progress session: %v", err)
		}
		if retrieved == nil {
			t.Fatal("Expected to find in-progress session")
		}
		if retrieved.ID != session.ID {
			t.Error("Session ID mismatch")
		}
		t.Logf("✓ Retrieved in-progress session: %s", retrieved.ID)
	})

	// Test UpdateCareSession (complete the session)
	t.Run("UpdateCareSession", func(t *testing.T) {
		completedAt := time.Now()
		notes := "Test session notes"
		session.Status = domain.StatusCompleted
		session.CompletedAt = &completedAt
		session.Notes = &notes
		session.UpdatedAt = time.Now()

		err := store.UpdateCareSession(ctx, session)
		if err != nil {
			t.Fatalf("Failed to update care session: %v", err)
		}

		updated, _ := store.GetCareSessionByID(ctx, session.ID)
		if updated.Status != domain.StatusCompleted {
			t.Errorf("Expected status 'completed', got '%s'", updated.Status)
		}
		if updated.CompletedAt == nil {
			t.Error("Expected completed_at to be set")
		}

		t.Logf("✓ Updated care session to completed")
	})

	// Test GetRecentCareSessionsForFamily
	t.Run("GetRecentCareSessionsForFamily", func(t *testing.T) {
		// Create another completed session for testing
		session2 := &domain.CareSession{
			ID:          uuid.New(),
			CaregiverID: caregiver.ID,
			FamilyID:    family.ID,
			Status:      domain.StatusCompleted,
			StartedAt:   time.Now().Add(-2 * time.Hour),
			CompletedAt: timePtr(time.Now().Add(-1 * time.Hour)),
			Notes:       nil,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		store.CreateCareSession(ctx, session2)

		sessions, err := store.GetRecentCareSessionsForFamily(ctx, family.ID, 5)
		if err != nil {
			t.Fatalf("Failed to get recent sessions: %v", err)
		}
		if len(sessions) < 2 {
			t.Errorf("Expected at least 2 sessions, got %d", len(sessions))
		}
		// Should be ordered by started_at DESC
		if len(sessions) >= 2 && sessions[0].StartedAt.Before(sessions[1].StartedAt) {
			t.Error("Sessions not ordered correctly (should be DESC)")
		}

		t.Logf("✓ Retrieved %d recent sessions", len(sessions))
	})

	// Test DeleteCareSession
	t.Run("DeleteCareSession", func(t *testing.T) {
		err := store.DeleteCareSession(ctx, session.ID)
		if err != nil {
			t.Fatalf("Failed to delete care session: %v", err)
		}

		// Verify deletion
		_, err = store.GetCareSessionByID(ctx, session.ID)
		if err == nil {
			t.Error("Expected error when getting deleted session")
		}

		t.Logf("✓ Deleted care session %s", session.ID)
	})
}

func timePtr(t time.Time) *time.Time {
	return &t
}
