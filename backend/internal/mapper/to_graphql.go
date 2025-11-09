package mapper

import (
	"github.com/swatkatz/babybaton/backend/graph/model"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// FamilyToGraphQL converts a domain Family to a GraphQL model
func FamilyToGraphQL(f *domain.Family) *model.Family {
	if f == nil {
		return nil
	}

	return &model.Family{
		ID:        f.ID.String(),
		Name:      f.Name,
		BabyName:  f.BabyName,
		Password:  f.Password, // Send plain password for sharing (HTTPS encrypts in transit)
		CreatedAt: f.CreatedAt,
		// Caregivers field loaded separately via resolver
	}
}

// CaregiverToGraphQL converts a domain Caregiver to a GraphQL model
func CaregiverToGraphQL(c *domain.Caregiver) *model.Caregiver {
	if c == nil {
		return nil
	}

	return &model.Caregiver{
		ID:         c.ID.String(),
		FamilyID:   c.FamilyID.String(),
		Name:       c.Name,
		DeviceID:   c.DeviceID,
		DeviceName: c.DeviceName,
		CreatedAt:  c.CreatedAt,
	}
}

// CareSessionToGraphQL converts a domain CareSession to a GraphQL model
func CareSessionToGraphQL(s *domain.CareSession) *model.CareSession {
	if s == nil {
		return nil
	}

	return &model.CareSession{
		ID:          s.ID.String(),
		FamilyID:    s.FamilyID.String(),
		Status:      model.CareSessionStatus(s.Status),
		StartedAt:   s.StartedAt,
		CompletedAt: s.CompletedAt,
		Notes:       s.Notes,
		// Caregiver, Activities, Summary loaded via resolvers
	}
}

// FeedDetailsToGraphQL converts domain FeedDetails to GraphQL model
func FeedDetailsToGraphQL(fd *domain.FeedDetails) *model.FeedDetails {
	if fd == nil {
		return nil
	}

	var durationMinutes *int32
	if fd.EndTime != nil && !fd.EndTime.IsZero() {
		duration := int32(fd.EndTime.Sub(fd.StartTime).Minutes())
		durationMinutes = &duration
	}

	var feedType *model.FeedType
	if fd.FeedType != nil {
		ft := model.FeedType(*fd.FeedType)
		feedType = &ft
	}

	var amountMl *int32
	if fd.AmountMl != nil {
		amt := int32(*fd.AmountMl)
		amountMl = &amt
	}

	return &model.FeedDetails{
		StartTime:       fd.StartTime,
		EndTime:         fd.EndTime,
		AmountMl:        amountMl,
		FeedType:        feedType,
		DurationMinutes: durationMinutes, // Calculated field
	}
}

// DiaperDetailsToGraphQL converts domain DiaperDetails to GraphQL model
func DiaperDetailsToGraphQL(dd *domain.DiaperDetails) *model.DiaperDetails {
	if dd == nil {
		return nil
	}

	return &model.DiaperDetails{
		ChangedAt: dd.ChangedAt,
		HadPoop:   dd.HadPoop,
		HadPee:    dd.HadPee,
	}
}

// SleepDetailsToGraphQL converts domain SleepDetails to GraphQL model
func SleepDetailsToGraphQL(sd *domain.SleepDetails) *model.SleepDetails {
	if sd == nil {
		return nil
	}

	var durationMinutes *int32
	var isActive *bool

	// Calculate duration if end time exists
	if sd.EndTime != nil && !sd.EndTime.IsZero() {
		duration := int32(sd.EndTime.Sub(sd.StartTime).Minutes())
		durationMinutes = &duration
		active := false
		isActive = &active
	} else {
		// No end time = still active
		active := true
		isActive = &active
	}

	return &model.SleepDetails{
		StartTime:       sd.StartTime,
		EndTime:         sd.EndTime,
		DurationMinutes: durationMinutes, // Calculated field
		IsActive:        isActive,        // Calculated field
	}
}