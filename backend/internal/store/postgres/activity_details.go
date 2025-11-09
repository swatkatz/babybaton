package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Activity detail operations (lazy loaded)

// Feed Details

// CreateFeedDetails creates feed details for an activity
func (s *PostgresStore) CreateFeedDetails(ctx context.Context, details *domain.FeedDetails) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO feed_details (id, activity_id, start_time, end_time, amount_ml, feed_type, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, details.ID, details.ActivityID, details.StartTime, details.EndTime, details.AmountMl, details.FeedType, details.CreatedAt, details.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create feed details: %w", err)
	}

	return nil
}

// GetFeedDetails retrieves feed details for an activity
func (s *PostgresStore) GetFeedDetails(ctx context.Context, activityID uuid.UUID) (*domain.FeedDetails, error) {
	details := &domain.FeedDetails{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, activity_id, start_time, end_time, amount_ml, feed_type, created_at, updated_at
		FROM feed_details
		WHERE activity_id = $1
	`, activityID).Scan(
		&details.ID,
		&details.ActivityID,
		&details.StartTime,
		&details.EndTime,
		&details.AmountMl,
		&details.FeedType,
		&details.CreatedAt,
		&details.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("feed details not found for activity: %s", activityID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get feed details: %w", err)
	}

	return details, nil
}

// Diaper Details

// CreateDiaperDetails creates diaper details for an activity
func (s *PostgresStore) CreateDiaperDetails(ctx context.Context, details *domain.DiaperDetails) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO diaper_details (id, activity_id, changed_at, had_poop, had_pee, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, details.ID, details.ActivityID, details.ChangedAt, details.HadPoop, details.HadPee, details.CreatedAt, details.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create diaper details: %w", err)
	}

	return nil
}

// GetDiaperDetails retrieves diaper details for an activity
func (s *PostgresStore) GetDiaperDetails(ctx context.Context, activityID uuid.UUID) (*domain.DiaperDetails, error) {
	details := &domain.DiaperDetails{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, activity_id, changed_at, had_poop, had_pee, created_at, updated_at
		FROM diaper_details
		WHERE activity_id = $1
	`, activityID).Scan(
		&details.ID,
		&details.ActivityID,
		&details.ChangedAt,
		&details.HadPoop,
		&details.HadPee,
		&details.CreatedAt,
		&details.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("diaper details not found for activity: %s", activityID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get diaper details: %w", err)
	}

	return details, nil
}

// Sleep Details

// CreateSleepDetails creates sleep details for an activity
func (s *PostgresStore) CreateSleepDetails(ctx context.Context, details *domain.SleepDetails) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sleep_details (id, activity_id, start_time, end_time, duration_minutes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, details.ID, details.ActivityID, details.StartTime, details.EndTime, details.DurationMinutes, details.CreatedAt, details.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create sleep details: %w", err)
	}

	return nil
}

// GetSleepDetails retrieves sleep details for an activity
func (s *PostgresStore) GetSleepDetails(ctx context.Context, activityID uuid.UUID) (*domain.SleepDetails, error) {
	details := &domain.SleepDetails{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, activity_id, start_time, end_time, duration_minutes, created_at, updated_at
		FROM sleep_details
		WHERE activity_id = $1
	`, activityID).Scan(
		&details.ID,
		&details.ActivityID,
		&details.StartTime,
		&details.EndTime,
		&details.DurationMinutes,
		&details.CreatedAt,
		&details.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("sleep details not found for activity: %s", activityID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get sleep details: %w", err)
	}

	return details, nil
}

// UpdateSleepDetails updates sleep details (for marking sleep as complete)
func (s *PostgresStore) UpdateSleepDetails(ctx context.Context, details *domain.SleepDetails) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE sleep_details
		SET end_time = $1, duration_minutes = $2, updated_at = $3
		WHERE id = $4
	`, details.EndTime, details.DurationMinutes, details.UpdatedAt, details.ID)

	if err != nil {
		return fmt.Errorf("failed to update sleep details: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("sleep details not found: %s", details.ID)
	}

	return nil
}
