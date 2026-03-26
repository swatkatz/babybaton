package graph

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var errNotFound = fmt.Errorf("not found")

func hashPassword(pw string) string {
	h, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.MinCost)
	return string(h)
}

type mockStore struct {
	// Configurable return values
	family                        *domain.Family
	familyErr                     error
	familyNameExists              bool
	familiesByUser                []*domain.Family
	caregiverByID                 *domain.Caregiver
	caregiverByIDErr              error
	caregiverByDeviceID           *domain.Caregiver
	getCaregiverByDeviceIDErr     error
	caregiverByUserAndFamily      *domain.Caregiver
	getCaregiverByUserAndFamilyErr error

	// Tracking calls
	lastCreatedCaregiver      *domain.Caregiver
	linkCaregiverToUserCalled bool
	deleteCaregiverCalled     bool
}

func newMockStore() *mockStore {
	return &mockStore{}
}

// Family operations
func (m *mockStore) CreateFamilyWithCaregiver(_ context.Context, _ *domain.Family, caregiver *domain.Caregiver) error {
	m.lastCreatedCaregiver = caregiver
	return nil
}

func (m *mockStore) GetFamilyByID(_ context.Context, _ uuid.UUID) (*domain.Family, error) {
	if m.family != nil {
		return m.family, nil
	}
	return nil, errNotFound
}

func (m *mockStore) GetFamilyByName(_ context.Context, _ string) (*domain.Family, error) {
	if m.family != nil {
		return m.family, nil
	}
	if m.familyErr != nil {
		return nil, m.familyErr
	}
	return nil, errNotFound
}

func (m *mockStore) UpdateFamily(_ context.Context, _ *domain.Family) error { return nil }
func (m *mockStore) DeleteFamily(_ context.Context, _ uuid.UUID) error      { return nil }

func (m *mockStore) FamilyNameExists(_ context.Context, _ string) (bool, error) {
	return m.familyNameExists, nil
}

func (m *mockStore) GetFamiliesByUserID(_ context.Context, _ uuid.UUID) ([]*domain.Family, error) {
	return m.familiesByUser, nil
}

// User operations
func (m *mockStore) CreateUser(_ context.Context, _ *domain.User) error { return nil }
func (m *mockStore) GetUserBySupabaseID(_ context.Context, _ string) (*domain.User, error) {
	return nil, errNotFound
}
func (m *mockStore) GetUserByID(_ context.Context, _ uuid.UUID) (*domain.User, error) {
	return nil, errNotFound
}

// Caregiver operations
func (m *mockStore) CreateCaregiver(_ context.Context, caregiver *domain.Caregiver) error {
	m.lastCreatedCaregiver = caregiver
	return nil
}

func (m *mockStore) GetCaregiverByID(_ context.Context, _ uuid.UUID) (*domain.Caregiver, error) {
	if m.caregiverByID != nil {
		return m.caregiverByID, nil
	}
	if m.caregiverByIDErr != nil {
		return nil, m.caregiverByIDErr
	}
	return nil, errNotFound
}

func (m *mockStore) GetCaregiverByDeviceID(_ context.Context, _ string) (*domain.Caregiver, error) {
	if m.caregiverByDeviceID != nil {
		return m.caregiverByDeviceID, nil
	}
	if m.getCaregiverByDeviceIDErr != nil {
		return nil, m.getCaregiverByDeviceIDErr
	}
	return nil, errNotFound
}

func (m *mockStore) GetCaregiverByUserAndFamily(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*domain.Caregiver, error) {
	if m.caregiverByUserAndFamily != nil {
		return m.caregiverByUserAndFamily, nil
	}
	if m.getCaregiverByUserAndFamilyErr != nil {
		return nil, m.getCaregiverByUserAndFamilyErr
	}
	return nil, errNotFound
}

func (m *mockStore) GetCaregiversByFamily(_ context.Context, _ uuid.UUID) ([]*domain.Caregiver, error) {
	return nil, nil
}

func (m *mockStore) UpdateCaregiver(_ context.Context, _ *domain.Caregiver) error { return nil }

func (m *mockStore) LinkCaregiverToUser(_ context.Context, _ uuid.UUID, _ uuid.UUID) error {
	m.linkCaregiverToUserCalled = true
	return nil
}

func (m *mockStore) DeleteCaregiver(_ context.Context, _ uuid.UUID) error {
	m.deleteCaregiverCalled = true
	return nil
}

// Care Session operations
func (m *mockStore) CreateCareSession(_ context.Context, _ *domain.CareSession) error { return nil }
func (m *mockStore) GetCareSessionByID(_ context.Context, _ uuid.UUID) (*domain.CareSession, error) {
	return nil, errNotFound
}
func (m *mockStore) GetInProgressSessionForFamily(_ context.Context, _ uuid.UUID) (*domain.CareSession, error) {
	return nil, nil
}
func (m *mockStore) GetRecentCareSessionsForFamily(_ context.Context, _ uuid.UUID, _ int) ([]*domain.CareSession, error) {
	return nil, nil
}
func (m *mockStore) UpdateCareSession(_ context.Context, _ *domain.CareSession) error { return nil }
func (m *mockStore) DeleteCareSession(_ context.Context, _ uuid.UUID) error            { return nil }

// Activity operations
func (m *mockStore) CreateActivity(_ context.Context, _ *domain.Activity) error { return nil }
func (m *mockStore) GetActivityByID(_ context.Context, _ uuid.UUID) (*domain.Activity, error) {
	return nil, errNotFound
}
func (m *mockStore) GetActivitiesForSession(_ context.Context, _ uuid.UUID) ([]*domain.Activity, error) {
	return nil, nil
}
func (m *mockStore) DeleteActivity(_ context.Context, _ uuid.UUID) error { return nil }

// Activity detail operations
func (m *mockStore) CreateFeedDetails(_ context.Context, _ *domain.FeedDetails) error { return nil }
func (m *mockStore) GetFeedDetails(_ context.Context, _ uuid.UUID) (*domain.FeedDetails, error) {
	return nil, errNotFound
}
func (m *mockStore) GetRecentFeedDetailsForFamily(_ context.Context, _ uuid.UUID, _ int) ([]*domain.FeedDetails, error) {
	return nil, nil
}
func (m *mockStore) UpdateFeedDetails(_ context.Context, _ *domain.FeedDetails) error { return nil }

func (m *mockStore) CreateDiaperDetails(_ context.Context, _ *domain.DiaperDetails) error {
	return nil
}
func (m *mockStore) GetDiaperDetails(_ context.Context, _ uuid.UUID) (*domain.DiaperDetails, error) {
	return nil, errNotFound
}
func (m *mockStore) UpdateDiaperDetails(_ context.Context, _ *domain.DiaperDetails) error {
	return nil
}

func (m *mockStore) CreateSleepDetails(_ context.Context, _ *domain.SleepDetails) error { return nil }
func (m *mockStore) GetSleepDetails(_ context.Context, _ uuid.UUID) (*domain.SleepDetails, error) {
	return nil, errNotFound
}
func (m *mockStore) UpdateSleepDetails(_ context.Context, _ *domain.SleepDetails) error { return nil }

func (m *mockStore) Close() error { return nil }
