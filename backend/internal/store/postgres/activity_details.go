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
		INSERT INTO feed_details (id, activity_id, start_time, end_time, amount_ml, feed_type, food_name, quantity, quantity_unit, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, details.ID, details.ActivityID, details.StartTime, details.EndTime, details.AmountMl, details.FeedType, details.FoodName, details.Quantity, details.QuantityUnit, details.CreatedAt, details.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create feed details: %w", err)
	}

	return nil
}

// GetFeedDetails retrieves feed details for an activity
func (s *PostgresStore) GetFeedDetails(ctx context.Context, activityID uuid.UUID) (*domain.FeedDetails, error) {
	details := &domain.FeedDetails{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, activity_id, start_time, end_time, amount_ml, feed_type, food_name, quantity, quantity_unit, created_at, updated_at
		FROM feed_details
		WHERE activity_id = $1
	`, activityID).Scan(
		&details.ID,
		&details.ActivityID,
		&details.StartTime,
		&details.EndTime,
		&details.AmountMl,
		&details.FeedType,
		&details.FoodName,
		&details.Quantity,
		&details.QuantityUnit,
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

// GetRecentFeedDetailsForFamily retrieves recent feed details across all sessions for a family
func (s *PostgresStore) GetRecentFeedDetailsForFamily(ctx context.Context, familyID uuid.UUID, limit int) ([]*domain.FeedDetails, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT fd.id, fd.activity_id, fd.start_time, fd.end_time, fd.amount_ml, fd.feed_type, fd.food_name, fd.quantity, fd.quantity_unit, fd.created_at, fd.updated_at
		FROM feed_details fd
		JOIN activities a ON fd.activity_id = a.id
		JOIN care_sessions cs ON a.care_session_id = cs.id
		WHERE cs.family_id = $1
		ORDER BY fd.start_time DESC
		LIMIT $2
	`, familyID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to query recent feed details: %w", err)
	}
	defer rows.Close()

	var details []*domain.FeedDetails
	for rows.Next() {
		d := &domain.FeedDetails{}
		err := rows.Scan(
			&d.ID, &d.ActivityID, &d.StartTime, &d.EndTime,
			&d.AmountMl, &d.FeedType, &d.FoodName, &d.Quantity, &d.QuantityUnit,
			&d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan feed details: %w", err)
		}
		details = append(details, d)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating feed details: %w", err)
	}

	return details, nil
}

// UpdateFeedDetails updates feed details for an activity
func (s *PostgresStore) UpdateFeedDetails(ctx context.Context, details *domain.FeedDetails) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE feed_details
		SET start_time = $1, end_time = $2, amount_ml = $3, feed_type = $4, food_name = $5, quantity = $6, quantity_unit = $7, updated_at = $8
		WHERE id = $9
	`, details.StartTime, details.EndTime, details.AmountMl, details.FeedType, details.FoodName, details.Quantity, details.QuantityUnit, details.UpdatedAt, details.ID)

	if err != nil {
		return fmt.Errorf("failed to update feed details: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("feed details not found: %s", details.ID)
	}

	return nil
}

// UpdateDiaperDetails updates diaper details for an activity
func (s *PostgresStore) UpdateDiaperDetails(ctx context.Context, details *domain.DiaperDetails) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE diaper_details
		SET changed_at = $1, had_poop = $2, had_pee = $3, updated_at = $4
		WHERE id = $5
	`, details.ChangedAt, details.HadPoop, details.HadPee, details.UpdatedAt, details.ID)

	if err != nil {
		return fmt.Errorf("failed to update diaper details: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("diaper details not found: %s", details.ID)
	}

	return nil
}

// GetRecentSleepDetailsForFamily retrieves recent sleep details across all sessions for a family
func (s *PostgresStore) GetRecentSleepDetailsForFamily(ctx context.Context, familyID uuid.UUID, limit int) ([]*domain.SleepDetails, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT sd.id, sd.activity_id, sd.start_time, sd.end_time, sd.duration_minutes, sd.created_at, sd.updated_at
		FROM sleep_details sd
		JOIN activities a ON sd.activity_id = a.id
		JOIN care_sessions cs ON a.care_session_id = cs.id
		WHERE cs.family_id = $1
		ORDER BY sd.start_time DESC
		LIMIT $2
	`, familyID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to query recent sleep details: %w", err)
	}
	defer rows.Close()

	var details []*domain.SleepDetails
	for rows.Next() {
		d := &domain.SleepDetails{}
		err := rows.Scan(
			&d.ID, &d.ActivityID, &d.StartTime, &d.EndTime,
			&d.DurationMinutes,
			&d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan sleep details: %w", err)
		}
		details = append(details, d)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating sleep details: %w", err)
	}

	return details, nil
}

// UpdateSleepDetails updates sleep details (for marking sleep as complete or editing)
func (s *PostgresStore) UpdateSleepDetails(ctx context.Context, details *domain.SleepDetails) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE sleep_details
		SET start_time = $1, end_time = $2, duration_minutes = $3, updated_at = $4
		WHERE id = $5
	`, details.StartTime, details.EndTime, details.DurationMinutes, details.UpdatedAt, details.ID)

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
