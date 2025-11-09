package postgres

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
	"github.com/swatkatz/babybaton/backend/internal/store"
)

// PostgresStore implements the Store interface using PostgreSQL
type PostgresStore struct {
	db *sql.DB
}

// Ensure PostgresStore implements Store interface
var _ store.Store = (*PostgresStore)(nil)

// NewPostgresStore creates a new PostgreSQL store
func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresStore{db: db}, nil
}

// Close closes the database connection
func (s *PostgresStore) Close() error {
	return s.db.Close()
}
