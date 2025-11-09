package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Family operations

// CreateFamilyWithCaregiver creates a family and its first caregiver atomically
func (s *PostgresStore) CreateFamilyWithCaregiver(ctx context.Context, family *domain.Family, caregiver *domain.Caregiver) error {
	// Start transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert family
	_, err = tx.ExecContext(ctx, `
		INSERT INTO families (id, name, password_hash, password, baby_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, family.ID, family.Name, family.PasswordHash, family.Password, family.BabyName, family.CreatedAt, family.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert family: %w", err)
	}

	// Insert caregiver
	_, err = tx.ExecContext(ctx, `
		INSERT INTO caregivers (id, family_id, name, device_id, device_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, caregiver.ID, caregiver.FamilyID, caregiver.Name, caregiver.DeviceID, caregiver.DeviceName, caregiver.CreatedAt, caregiver.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert caregiver: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetFamilyByID retrieves a family by ID
func (s *PostgresStore) GetFamilyByID(ctx context.Context, id uuid.UUID) (*domain.Family, error) {
	family := &domain.Family{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, password_hash, baby_name, created_at, updated_at
		FROM families
		WHERE id = $1
	`, id).Scan(
		&family.ID,
		&family.Name,
		&family.PasswordHash,
		&family.BabyName,
		&family.CreatedAt,
		&family.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("family not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get family: %w", err)
	}

	return family, nil
}

// GetFamilyByName retrieves a family by name (case-insensitive)
func (s *PostgresStore) GetFamilyByName(ctx context.Context, name string) (*domain.Family, error) {
	family := &domain.Family{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, password_hash, baby_name, created_at, updated_at
		FROM families
		WHERE LOWER(name) = LOWER($1)
	`, name).Scan(
		&family.ID,
		&family.Name,
		&family.PasswordHash,
		&family.BabyName,
		&family.CreatedAt,
		&family.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("family not found: %s", name)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get family: %w", err)
	}

	return family, nil
}

// UpdateFamily updates an existing family
func (s *PostgresStore) UpdateFamily(ctx context.Context, family *domain.Family) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE families
		SET name = $1, password_hash = $2, baby_name = $3, updated_at = $4
		WHERE id = $5
	`, family.Name, family.PasswordHash, family.BabyName, family.UpdatedAt, family.ID)

	if err != nil {
		return fmt.Errorf("failed to update family: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("family not found: %s", family.ID)
	}

	return nil
}

// DeleteFamily deletes a family (cascades to caregivers and sessions)
func (s *PostgresStore) DeleteFamily(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM families WHERE id = $1
	`, id)

	if err != nil {
		return fmt.Errorf("failed to delete family: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("family not found: %s", id)
	}

	return nil
}

// FamilyNameExists checks if a family name already exists (case-insensitive)
func (s *PostgresStore) FamilyNameExists(ctx context.Context, name string) (bool, error) {
	var exists bool

	err := s.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM families WHERE LOWER(name) = LOWER($1))
	`, name).Scan(&exists)

	if err != nil {
		return false, fmt.Errorf("failed to check family name existence: %w", err)
	}

	return exists, nil
}
