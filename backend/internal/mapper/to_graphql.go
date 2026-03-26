package mapper

import (
	"fmt"

	"github.com/swatkatz/babybaton/backend/graph/model"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// domainFeedTypeToGraphQL maps domain FeedType (lowercase) to GraphQL FeedType (uppercase).
func domainFeedTypeToGraphQL(dt domain.FeedType) (model.FeedType, error) {
	switch dt {
	case domain.FeedTypeBreastMilk:
		return model.FeedTypeBreastMilk, nil
	case domain.FeedTypeFormula:
		return model.FeedTypeFormula, nil
	case domain.FeedTypeSolids:
		return model.FeedTypeSolids, nil
	default:
		return "", fmt.Errorf("unknown domain FeedType: %q", dt)
	}
}

// domainQuantityUnitToGraphQL maps a domain quantity unit string to GraphQL SolidsUnit.
func domainQuantityUnitToGraphQL(unit string) (model.SolidsUnit, error) {
	switch unit {
	case "spoons":
		return model.SolidsUnitSpoons, nil
	case "bowls":
		return model.SolidsUnitBowls, nil
	case "pieces":
		return model.SolidsUnitPieces, nil
	case "portions":
		return model.SolidsUnitPortions, nil
	default:
		return "", fmt.Errorf("unknown domain QuantityUnit: %q", unit)
	}
}

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

	var deviceID string
	if c.DeviceID != nil {
		deviceID = *c.DeviceID
	}

	return &model.Caregiver{
		ID:         c.ID.String(),
		FamilyID:   c.FamilyID.String(),
		Name:       c.Name,
		DeviceID:   deviceID,
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

// ActivityToGraphQL converts a domain Activity to a GraphQL model (concrete type based on ActivityType)
func ActivityToGraphQL(a *domain.Activity) model.Activity {
	if a == nil {
		return nil
	}

	// Return appropriate concrete type based on activity type
	switch a.ActivityType {
	case domain.ActivityTypeFeed:
		return &model.FeedActivity{
			ID:           a.ID.String(),
			ActivityType: model.ActivityType(a.ActivityType),
			CreatedAt:    a.CreatedAt,
			// FeedDetails loaded via resolver
		}
	case domain.ActivityTypeDiaper:
		return &model.DiaperActivity{
			ID:           a.ID.String(),
			ActivityType: model.ActivityType(a.ActivityType),
			CreatedAt:    a.CreatedAt,
			// DiaperDetails loaded via resolver
		}
	case domain.ActivityTypeSleep:
		return &model.SleepActivity{
			ID:           a.ID.String(),
			ActivityType: model.ActivityType(a.ActivityType),
			CreatedAt:    a.CreatedAt,
			// SleepDetails loaded via resolver
		}
	default:
		return nil
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
		ft, err := domainFeedTypeToGraphQL(*fd.FeedType)
		if err == nil {
			feedType = &ft
		}
	}

	var amountMl *int32
	if fd.AmountMl != nil {
		amt := int32(*fd.AmountMl)
		amountMl = &amt
	}

	var quantityUnit *model.SolidsUnit
	if fd.QuantityUnit != nil {
		qu, err := domainQuantityUnitToGraphQL(*fd.QuantityUnit)
		if err == nil {
			quantityUnit = &qu
		}
	}

	return &model.FeedDetails{
		StartTime:       fd.StartTime,
		EndTime:         fd.EndTime,
		AmountMl:        amountMl,
		FeedType:        feedType,
		DurationMinutes: durationMinutes, // Calculated field
		FoodName:        fd.FoodName,
		Quantity:        fd.Quantity,
		QuantityUnit:    quantityUnit,
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