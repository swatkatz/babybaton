package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func (s *PostgresStore) GetScheduleGoals(ctx context.Context, familyID uuid.UUID) (*domain.ScheduleGoals, error) {
	sg := &domain.ScheduleGoals{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, family_id, target_wake_window_minutes, target_feed_interval_minutes,
		        target_nap_count, max_daytime_nap_minutes, target_bedtime, target_wake_time,
		        created_at, updated_at
		 FROM schedule_goals
		 WHERE family_id = $1`,
		familyID,
	).Scan(
		&sg.ID, &sg.FamilyID,
		&sg.TargetWakeWindowMinutes, &sg.TargetFeedIntervalMinutes,
		&sg.TargetNapCount, &sg.MaxDaytimeNapMinutes,
		&sg.TargetBedtime, &sg.TargetWakeTime,
		&sg.CreatedAt, &sg.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return sg, nil
}

func (s *PostgresStore) UpsertScheduleGoals(ctx context.Context, familyID uuid.UUID, goals *domain.ScheduleGoals) (*domain.ScheduleGoals, error) {
	now := time.Now()
	id := uuid.New()

	err := s.db.QueryRowContext(ctx,
		`INSERT INTO schedule_goals (id, family_id, target_wake_window_minutes, target_feed_interval_minutes,
		        target_nap_count, max_daytime_nap_minutes, target_bedtime, target_wake_time,
		        created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (family_id) DO UPDATE SET
		        target_wake_window_minutes = COALESCE(EXCLUDED.target_wake_window_minutes, schedule_goals.target_wake_window_minutes),
		        target_feed_interval_minutes = COALESCE(EXCLUDED.target_feed_interval_minutes, schedule_goals.target_feed_interval_minutes),
		        target_nap_count = COALESCE(EXCLUDED.target_nap_count, schedule_goals.target_nap_count),
		        max_daytime_nap_minutes = COALESCE(EXCLUDED.max_daytime_nap_minutes, schedule_goals.max_daytime_nap_minutes),
		        target_bedtime = COALESCE(EXCLUDED.target_bedtime, schedule_goals.target_bedtime),
		        target_wake_time = COALESCE(EXCLUDED.target_wake_time, schedule_goals.target_wake_time),
		        updated_at = $10
		 RETURNING id, family_id, target_wake_window_minutes, target_feed_interval_minutes,
		        target_nap_count, max_daytime_nap_minutes, target_bedtime, target_wake_time,
		        created_at, updated_at`,
		id, familyID,
		goals.TargetWakeWindowMinutes, goals.TargetFeedIntervalMinutes,
		goals.TargetNapCount, goals.MaxDaytimeNapMinutes,
		goals.TargetBedtime, goals.TargetWakeTime,
		now, now,
	).Scan(
		&goals.ID, &goals.FamilyID,
		&goals.TargetWakeWindowMinutes, &goals.TargetFeedIntervalMinutes,
		&goals.TargetNapCount, &goals.MaxDaytimeNapMinutes,
		&goals.TargetBedtime, &goals.TargetWakeTime,
		&goals.CreatedAt, &goals.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return goals, nil
}
