package domain

import (
	"time"

	"github.com/google/uuid"
)

// Enums
type SessionStatus string

const (
	StatusInProgress SessionStatus = "in_progress"
	StatusCompleted  SessionStatus = "completed"
)

type ActivityType string

const (
	ActivityTypeFeed   ActivityType = "feed"
	ActivityTypeDiaper ActivityType = "diaper"
	ActivityTypeSleep  ActivityType = "sleep"
)

type FeedType string

const (
	FeedTypeBreastMilk FeedType = "breast_milk"
	FeedTypeFormula    FeedType = "formula"
)

// Domain Models

type Family struct {
	ID           uuid.UUID
	Name         string
	PasswordHash string // bcrypt hash for authentication
	Password     string // plain text password for sharing (stored in DB)
	BabyName     string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Caregiver struct {
	ID         uuid.UUID
	FamilyID   uuid.UUID
	Name       string
	DeviceID   string
	DeviceName *string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CareSession struct {
	ID          uuid.UUID
	CaregiverID uuid.UUID
	FamilyID    uuid.UUID
	Status      SessionStatus
	StartedAt   time.Time
	CompletedAt *time.Time
	Notes       *string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Activity struct {
	ID            uuid.UUID
	CareSessionID uuid.UUID
	ActivityType  ActivityType
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type FeedDetails struct {
	ID         uuid.UUID
	ActivityID uuid.UUID
	StartTime  time.Time
	EndTime    *time.Time
	AmountMl   *int
	FeedType   *FeedType
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type DiaperDetails struct {
	ID        uuid.UUID
	ActivityID uuid.UUID
	ChangedAt time.Time
	HadPoop   bool
	HadPee    bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

type SleepDetails struct {
	ID              uuid.UUID
	ActivityID      uuid.UUID
	StartTime       time.Time
	EndTime         *time.Time
	DurationMinutes *int
	CreatedAt       time.Time
	UpdatedAt       time.Time
}