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

func TestGetCareSessionHistoryForFamily(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	family, caregiver, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
	})

	// Create 5 sessions with distinct timestamps and statuses
	now := time.Now().UTC().Truncate(time.Microsecond)
	sessions := make([]*domain.CareSession, 5)
	for i := 0; i < 5; i++ {
		status := domain.StatusCompleted
		var completedAt *time.Time
		if i == 0 {
			// newest session is in_progress
			status = domain.StatusInProgress
		} else {
			ct := now.Add(time.Duration(-i) * time.Hour).Add(30 * time.Minute)
			completedAt = &ct
		}
		sessions[i] = &domain.CareSession{
			ID:          uuid.New(),
			CaregiverID: caregiver.ID,
			FamilyID:    family.ID,
			Status:      status,
			StartedAt:   now.Add(time.Duration(-i) * time.Hour),
			CompletedAt: completedAt,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := store.CreateCareSession(ctx, sessions[i]); err != nil {
			t.Fatalf("Failed to create session %d: %v", i, err)
		}
	}

	t.Run("FirstPage", func(t *testing.T) {
		results, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 3, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 3 {
			t.Fatalf("expected 3 sessions, got %d", len(results))
		}
		// Should be newest first (sessions[0] is newest)
		if results[0].ID != sessions[0].ID {
			t.Errorf("expected first result to be newest session")
		}
	})

	t.Run("NextPage_WithCursor", func(t *testing.T) {
		// Get first page
		firstPage, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 3, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Use last item of first page as cursor
		lastSession := firstPage[len(firstPage)-1]
		afterTime := lastSession.StartedAt
		afterID := lastSession.ID

		secondPage, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 3, &afterTime, &afterID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(secondPage) != 2 {
			t.Fatalf("expected 2 sessions on second page, got %d", len(secondPage))
		}

		// No overlap with first page
		firstPageIDs := map[uuid.UUID]bool{}
		for _, s := range firstPage {
			firstPageIDs[s.ID] = true
		}
		for _, s := range secondPage {
			if firstPageIDs[s.ID] {
				t.Errorf("session %s appears in both pages", s.ID)
			}
		}
	})

	t.Run("IncludesBothStatuses", func(t *testing.T) {
		results, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 10, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		hasInProgress := false
		hasCompleted := false
		for _, s := range results {
			if s.Status == domain.StatusInProgress {
				hasInProgress = true
			}
			if s.Status == domain.StatusCompleted {
				hasCompleted = true
			}
		}
		if !hasInProgress {
			t.Error("expected at least one in_progress session")
		}
		if !hasCompleted {
			t.Error("expected at least one completed session")
		}
	})

	t.Run("EmptyResults", func(t *testing.T) {
		nonExistentFamily := uuid.New()
		results, err := store.GetCareSessionHistoryForFamily(ctx, nonExistentFamily, 10, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 0 {
			t.Errorf("expected 0 sessions, got %d", len(results))
		}
	})

	t.Run("SingleItemPage", func(t *testing.T) {
		results, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 1, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 1 {
			t.Fatalf("expected 1 session, got %d", len(results))
		}
		if results[0].ID != sessions[0].ID {
			t.Errorf("expected newest session")
		}
	})

	t.Run("BeyondLastPage", func(t *testing.T) {
		// Use a cursor that's older than all sessions
		oldTime := now.Add(-100 * time.Hour)
		oldID := uuid.New()
		results, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 10, &oldTime, &oldID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 0 {
			t.Errorf("expected 0 sessions beyond last page, got %d", len(results))
		}
	})

	t.Run("OrderIsNewestFirst", func(t *testing.T) {
		results, err := store.GetCareSessionHistoryForFamily(ctx, family.ID, 10, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		for i := 1; i < len(results); i++ {
			if results[i].StartedAt.After(results[i-1].StartedAt) {
				t.Errorf("session %d started after session %d (not DESC order)", i, i-1)
			}
		}
	})
}

func timePtr(t time.Time) *time.Time {
	return &t
}
