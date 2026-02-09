package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// Store defines the interface for data persistence operations
type Store interface {
	// Family operations
	CreateFamilyWithCaregiver(ctx context.Context, family *domain.Family, caregiver *domain.Caregiver) error
	GetFamilyByID(ctx context.Context, id uuid.UUID) (*domain.Family, error)
	GetFamilyByName(ctx context.Context, name string) (*domain.Family, error)
	UpdateFamily(ctx context.Context, family *domain.Family) error
	DeleteFamily(ctx context.Context, id uuid.UUID) error
	FamilyNameExists(ctx context.Context, name string) (bool, error)

	// Caregiver operations
	CreateCaregiver(ctx context.Context, caregiver *domain.Caregiver) error
	GetCaregiverByID(ctx context.Context, id uuid.UUID) (*domain.Caregiver, error)
	GetCaregiverByDeviceID(ctx context.Context, deviceID string) (*domain.Caregiver, error)
	GetCaregiversByFamily(ctx context.Context, familyID uuid.UUID) ([]*domain.Caregiver, error)
	UpdateCaregiver(ctx context.Context, caregiver *domain.Caregiver) error
	DeleteCaregiver(ctx context.Context, id uuid.UUID) error

	// Care Session operations
	CreateCareSession(ctx context.Context, session *domain.CareSession) error
	GetCareSessionByID(ctx context.Context, id uuid.UUID) (*domain.CareSession, error)
	GetInProgressSessionForFamily(ctx context.Context, familyID uuid.UUID) (*domain.CareSession, error)
	GetRecentCareSessionsForFamily(ctx context.Context, familyID uuid.UUID, limit int) ([]*domain.CareSession, error)
	UpdateCareSession(ctx context.Context, session *domain.CareSession) error
	DeleteCareSession(ctx context.Context, id uuid.UUID) error

	// Activity operations (details loaded separately via resolvers)
	CreateActivity(ctx context.Context, activity *domain.Activity) error
	GetActivityByID(ctx context.Context, id uuid.UUID) (*domain.Activity, error)
	GetActivitiesForSession(ctx context.Context, sessionID uuid.UUID) ([]*domain.Activity, error)
	DeleteActivity(ctx context.Context, id uuid.UUID) error

	// Activity detail operations (lazy loaded)
	CreateFeedDetails(ctx context.Context, details *domain.FeedDetails) error
	GetFeedDetails(ctx context.Context, activityID uuid.UUID) (*domain.FeedDetails, error)
	
	CreateDiaperDetails(ctx context.Context, details *domain.DiaperDetails) error
	GetDiaperDetails(ctx context.Context, activityID uuid.UUID) (*domain.DiaperDetails, error)
	
	CreateSleepDetails(ctx context.Context, details *domain.SleepDetails) error
	GetSleepDetails(ctx context.Context, activityID uuid.UUID) (*domain.SleepDetails, error)
	UpdateSleepDetails(ctx context.Context, details *domain.SleepDetails) error

	// Lifecycle
	Close() error
}