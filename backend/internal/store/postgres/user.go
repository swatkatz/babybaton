package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// User operations

// CreateUser creates a new user
func (s *PostgresStore) CreateUser(ctx context.Context, user *domain.User) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO users (id, supabase_user_id, email, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`, user.ID, user.SupabaseUserID, user.Email, user.CreatedAt, user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetUserBySupabaseID retrieves a user by their Supabase user ID
func (s *PostgresStore) GetUserBySupabaseID(ctx context.Context, supabaseUserID string) (*domain.User, error) {
	user := &domain.User{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, supabase_user_id, email, created_at, updated_at
		FROM users
		WHERE supabase_user_id = $1
	`, supabaseUserID).Scan(
		&user.ID,
		&user.SupabaseUserID,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found with supabase ID: %s", supabaseUserID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by supabase ID: %w", err)
	}

	return user, nil
}

// GetUserByID retrieves a user by their internal ID
func (s *PostgresStore) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	user := &domain.User{}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, supabase_user_id, email, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID,
		&user.SupabaseUserID,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}
