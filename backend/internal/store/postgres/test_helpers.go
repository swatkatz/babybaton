package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

// CreateTestFamily creates a unique test family with a caregiver for testing
func CreateTestFamily(ctx context.Context, store *PostgresStore) (*domain.Family, *domain.Caregiver, error) {
	// Generate unique name using UUID
	uniqueName := "Test Family " + uuid.New().String()[:8]
	password := "testpass"
	
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	
	family := &domain.Family{
		ID:           uuid.New(),
		Name:         uniqueName,
		PasswordHash: string(passwordHash),
		Password: password,
		BabyName:     "Test Baby",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	caregiver := &domain.Caregiver{
		ID:         uuid.New(),
		FamilyID:   family.ID,
		Name:       "Test Mom",
		DeviceID:   "test-device-" + uuid.New().String()[:8],
		DeviceName: stringPtr("Test iPhone"),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := store.CreateFamilyWithCaregiver(ctx, family, caregiver)
	if err != nil {
		return nil, nil, err
	}

	return family, caregiver, nil
}

func stringPtr(s string) *string {
	return &s
}