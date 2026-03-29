package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func (s *PostgresStore) UpsertPredictions(ctx context.Context, familyID uuid.UUID, predictions []*domain.Prediction) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete existing non-dismissed predictions for this family
	_, err = tx.ExecContext(ctx,
		`DELETE FROM predictions WHERE family_id = $1 AND dismissed_at IS NULL`,
		familyID,
	)
	if err != nil {
		return err
	}

	// Insert new predictions
	for _, p := range predictions {
		var careSessionID *uuid.UUID
		if p.CareSessionID != nil {
			careSessionID = p.CareSessionID
		}
		var confidence *string
		if p.Confidence != nil {
			c := string(*p.Confidence)
			confidence = &c
		}

		_, err = tx.ExecContext(ctx,
			`INSERT INTO predictions (id, family_id, care_session_id, activity_type, prediction_type, predicted_time, status, confidence, reasoning, predicted_amount_ml, predicted_duration_minutes, computed_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			p.ID, familyID, careSessionID, string(p.ActivityType), string(p.PredictionType),
			p.PredictedTime, string(p.Status), confidence, p.Reasoning,
			p.PredictedAmountMl, p.PredictedDurationMinutes, p.ComputedAt,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *PostgresStore) GetPredictionsForFamily(ctx context.Context, familyID uuid.UUID) ([]*domain.Prediction, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, family_id, care_session_id, activity_type, prediction_type, predicted_time, status, confidence, reasoning, predicted_amount_ml, predicted_duration_minutes, computed_at, created_at
		 FROM predictions
		 WHERE family_id = $1 AND dismissed_at IS NULL
		 ORDER BY predicted_time ASC`,
		familyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var predictions []*domain.Prediction
	for rows.Next() {
		p := &domain.Prediction{}
		var careSessionID *uuid.UUID
		var activityType, predictionType, status string
		var confidence *string

		err := rows.Scan(
			&p.ID, &p.FamilyID, &careSessionID,
			&activityType, &predictionType, &p.PredictedTime,
			&status, &confidence, &p.Reasoning,
			&p.PredictedAmountMl, &p.PredictedDurationMinutes,
			&p.ComputedAt, &p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		p.CareSessionID = careSessionID
		p.ActivityType = domain.ActivityType(activityType)
		p.PredictionType = domain.PredictionType(predictionType)
		p.Status = domain.PredictionStatus(status)
		if confidence != nil {
			c := domain.PredictionConfidence(*confidence)
			p.Confidence = &c
		}

		predictions = append(predictions, p)
	}

	return predictions, rows.Err()
}

func (s *PostgresStore) DismissPrediction(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx,
		`UPDATE predictions SET dismissed_at = $1 WHERE id = $2`,
		time.Now(), id,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (s *PostgresStore) DeletePredictionsForFamily(ctx context.Context, familyID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM predictions WHERE family_id = $1`,
		familyID,
	)
	return err
}

func (s *PostgresStore) CleanupOldPredictions(ctx context.Context, olderThan time.Time) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM predictions WHERE created_at < $1`,
		olderThan,
	)
	return err
}
