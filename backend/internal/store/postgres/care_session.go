package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Care Session operations

// CreateCareSession creates a new care session
func (s *PostgresStore) CreateCareSession(ctx context.Context, session *domain.CareSession) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO care_sessions (id, caregiver_id, family_id, status, started_at, completed_at, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, session.ID, session.CaregiverID, session.FamilyID, session.Status, session.StartedAt, session.CompletedAt, session.Notes, session.CreatedAt, session.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create care session: %w", err)
	}

	return nil
}

// GetCareSessionByID retrieves a care session by ID
func (s *PostgresStore) GetCareSessionByID(ctx context.Context, id uuid.UUID) (*domain.CareSession, error) {
	session := &domain.CareSession{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, caregiver_id, family_id, status, started_at, completed_at, notes, created_at, updated_at
		FROM care_sessions
		WHERE id = $1
	`, id).Scan(
		&session.ID,
		&session.CaregiverID,
		&session.FamilyID,
		&session.Status,
		&session.StartedAt,
		&session.CompletedAt,
		&session.Notes,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("care session not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get care session: %w", err)
	}

	return session, nil
}

// GetInProgressSessionForFamily retrieves the current in-progress session for a family
func (s *PostgresStore) GetInProgressSessionForFamily(ctx context.Context, familyID uuid.UUID) (*domain.CareSession, error) {
	session := &domain.CareSession{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, caregiver_id, family_id, status, started_at, completed_at, notes, created_at, updated_at
		FROM care_sessions
		WHERE family_id = $1 AND status = $2
		ORDER BY started_at DESC
		LIMIT 1
	`, familyID, domain.StatusInProgress).Scan(
		&session.ID,
		&session.CaregiverID,
		&session.FamilyID,
		&session.Status,
		&session.StartedAt,
		&session.CompletedAt,
		&session.Notes,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No in-progress session is not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get in-progress session: %w", err)
	}

	return session, nil
}

// GetRecentCareSessionsForFamily retrieves recent completed sessions for a family
func (s *PostgresStore) GetRecentCareSessionsForFamily(ctx context.Context, familyID uuid.UUID, limit int) ([]*domain.CareSession, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, caregiver_id, family_id, status, started_at, completed_at, notes, created_at, updated_at
		FROM care_sessions
		WHERE family_id = $1 AND status = $2
		ORDER BY started_at DESC
		LIMIT $3
	`, familyID, domain.StatusCompleted, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to query recent sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*domain.CareSession
	for rows.Next() {
		session := &domain.CareSession{}
		err := rows.Scan(
			&session.ID,
			&session.CaregiverID,
			&session.FamilyID,
			&session.Status,
			&session.StartedAt,
			&session.CompletedAt,
			&session.Notes,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, session)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating sessions: %w", err)
	}

	return sessions, nil
}

// UpdateCareSession updates an existing care session
func (s *PostgresStore) UpdateCareSession(ctx context.Context, session *domain.CareSession) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE care_sessions
		SET status = $1, completed_at = $2, notes = $3, updated_at = $4
		WHERE id = $5
	`, session.Status, session.CompletedAt, session.Notes, session.UpdatedAt, session.ID)

	if err != nil {
		return fmt.Errorf("failed to update care session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("care session not found: %s", session.ID)
	}

	return nil
}

// DeleteCareSession deletes a care session (cascades to activities and their details)
func (s *PostgresStore) DeleteCareSession(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM care_sessions WHERE id = $1
	`, id)

	if err != nil {
		return fmt.Errorf("failed to delete care session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("care session not found: %s", id)
	}

	return nil
}
