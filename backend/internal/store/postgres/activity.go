package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Activity operations

// CreateActivity creates a new activity
func (s *PostgresStore) CreateActivity(ctx context.Context, activity *domain.Activity) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO activities (id, care_session_id, activity_type, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`, activity.ID, activity.CareSessionID, activity.ActivityType, activity.CreatedAt, activity.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create activity: %w", err)
	}

	return nil
}

// GetActivityByID retrieves a single activity by ID
func (s *PostgresStore) GetActivityByID(ctx context.Context, id uuid.UUID) (*domain.Activity, error) {
	activity := &domain.Activity{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, care_session_id, activity_type, created_at, updated_at
		FROM activities
		WHERE id = $1
	`, id).Scan(
		&activity.ID,
		&activity.CareSessionID,
		&activity.ActivityType,
		&activity.CreatedAt,
		&activity.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}

	return activity, nil
}

// GetActivitiesForSession retrieves all activities for a care session
func (s *PostgresStore) GetActivitiesForSession(ctx context.Context, sessionID uuid.UUID) ([]*domain.Activity, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, care_session_id, activity_type, created_at, updated_at
		FROM activities
		WHERE care_session_id = $1
		ORDER BY created_at ASC
	`, sessionID)

	if err != nil {
		return nil, fmt.Errorf("failed to query activities: %w", err)
	}
	defer rows.Close()

	var activities []*domain.Activity
	for rows.Next() {
		activity := &domain.Activity{}
		err := rows.Scan(
			&activity.ID,
			&activity.CareSessionID,
			&activity.ActivityType,
			&activity.CreatedAt,
			&activity.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}
		activities = append(activities, activity)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating activities: %w", err)
	}

	return activities, nil
}

// DeleteActivity deletes an activity (cascades to activity details)
func (s *PostgresStore) DeleteActivity(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM activities WHERE id = $1
	`, id)

	if err != nil {
		return fmt.Errorf("failed to delete activity: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("activity not found: %s", id)
	}

	return nil
}
