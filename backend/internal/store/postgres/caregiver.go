package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Caregiver operations

// CreateCaregiver creates a new caregiver
func (s *PostgresStore) CreateCaregiver(ctx context.Context, caregiver *domain.Caregiver) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO caregivers (id, family_id, name, device_id, device_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, caregiver.ID, caregiver.FamilyID, caregiver.Name, caregiver.DeviceID, caregiver.DeviceName, caregiver.CreatedAt, caregiver.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create caregiver: %w", err)
	}

	return nil
}

// GetCaregiverByID retrieves a caregiver by ID
func (s *PostgresStore) GetCaregiverByID(ctx context.Context, id uuid.UUID) (*domain.Caregiver, error) {
	caregiver := &domain.Caregiver{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, family_id, name, device_id, device_name, created_at, updated_at
		FROM caregivers
		WHERE id = $1
	`, id).Scan(
		&caregiver.ID,
		&caregiver.FamilyID,
		&caregiver.Name,
		&caregiver.DeviceID,
		&caregiver.DeviceName,
		&caregiver.CreatedAt,
		&caregiver.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("caregiver not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get caregiver: %w", err)
	}

	return caregiver, nil
}

// GetCaregiverByDeviceID retrieves a caregiver by device ID
func (s *PostgresStore) GetCaregiverByDeviceID(ctx context.Context, deviceID string) (*domain.Caregiver, error) {
	caregiver := &domain.Caregiver{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, family_id, name, device_id, device_name, created_at, updated_at
		FROM caregivers
		WHERE device_id = $1
	`, deviceID).Scan(
		&caregiver.ID,
		&caregiver.FamilyID,
		&caregiver.Name,
		&caregiver.DeviceID,
		&caregiver.DeviceName,
		&caregiver.CreatedAt,
		&caregiver.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("caregiver not found with device ID: %s", deviceID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get caregiver by device ID: %w", err)
	}

	return caregiver, nil
}

// GetCaregiversByFamily retrieves all caregivers for a family
func (s *PostgresStore) GetCaregiversByFamily(ctx context.Context, familyID uuid.UUID) ([]*domain.Caregiver, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, family_id, name, device_id, device_name, created_at, updated_at
		FROM caregivers
		WHERE family_id = $1
		ORDER BY created_at ASC
	`, familyID)

	if err != nil {
		return nil, fmt.Errorf("failed to query caregivers: %w", err)
	}
	defer rows.Close()

	var caregivers []*domain.Caregiver
	for rows.Next() {
		caregiver := &domain.Caregiver{}
		err := rows.Scan(
			&caregiver.ID,
			&caregiver.FamilyID,
			&caregiver.Name,
			&caregiver.DeviceID,
			&caregiver.DeviceName,
			&caregiver.CreatedAt,
			&caregiver.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan caregiver: %w", err)
		}
		caregivers = append(caregivers, caregiver)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating caregivers: %w", err)
	}

	return caregivers, nil
}

// UpdateCaregiver updates an existing caregiver
func (s *PostgresStore) UpdateCaregiver(ctx context.Context, caregiver *domain.Caregiver) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE caregivers
		SET name = $1, device_id = $2, device_name = $3, updated_at = $4
		WHERE id = $5
	`, caregiver.Name, caregiver.DeviceID, caregiver.DeviceName, caregiver.UpdatedAt, caregiver.ID)

	if err != nil {
		return fmt.Errorf("failed to update caregiver: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("caregiver not found: %s", caregiver.ID)
	}

	return nil
}

// DeleteCaregiver deletes a caregiver
func (s *PostgresStore) DeleteCaregiver(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM caregivers WHERE id = $1
	`, id)

	if err != nil {
		return fmt.Errorf("failed to delete caregiver: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("caregiver not found: %s", id)
	}

	return nil
}
