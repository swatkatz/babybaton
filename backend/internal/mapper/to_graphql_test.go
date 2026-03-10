package mapper

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/graph/model"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestFamilyToGraphQL(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	id := uuid.New()

	f := &domain.Family{
		ID:        id,
		Name:      "Smith Family",
		BabyName:  "Liam",
		Password:  "abc123",
		CreatedAt: now,
	}

	result := FamilyToGraphQL(f)

	if result.ID != id.String() {
		t.Errorf("ID = %q, want %q", result.ID, id.String())
	}
	if result.Name != "Smith Family" {
		t.Errorf("Name = %q, want %q", result.Name, "Smith Family")
	}
	if result.BabyName != "Liam" {
		t.Errorf("BabyName = %q, want %q", result.BabyName, "Liam")
	}
	if result.Password != "abc123" {
		t.Errorf("Password = %q, want %q", result.Password, "abc123")
	}
	if !result.CreatedAt.Equal(now) {
		t.Errorf("CreatedAt = %v, want %v", result.CreatedAt, now)
	}
}

func TestFamilyToGraphQL_Nil(t *testing.T) {
	result := FamilyToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}

func TestCaregiverToGraphQL(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	id := uuid.New()
	familyID := uuid.New()
	deviceName := "iPhone 15"

	c := &domain.Caregiver{
		ID:         id,
		FamilyID:   familyID,
		Name:       "Alice",
		DeviceID:   "device-123",
		DeviceName: &deviceName,
		CreatedAt:  now,
	}

	result := CaregiverToGraphQL(c)

	if result.ID != id.String() {
		t.Errorf("ID = %q, want %q", result.ID, id.String())
	}
	if result.FamilyID != familyID.String() {
		t.Errorf("FamilyID = %q, want %q", result.FamilyID, familyID.String())
	}
	if result.Name != "Alice" {
		t.Errorf("Name = %q, want %q", result.Name, "Alice")
	}
	if result.DeviceID != "device-123" {
		t.Errorf("DeviceID = %q, want %q", result.DeviceID, "device-123")
	}
	if result.DeviceName == nil || *result.DeviceName != "iPhone 15" {
		t.Errorf("DeviceName = %v, want %q", result.DeviceName, "iPhone 15")
	}
}

func TestCaregiverToGraphQL_NilDeviceName(t *testing.T) {
	c := &domain.Caregiver{
		ID:       uuid.New(),
		FamilyID: uuid.New(),
		Name:     "Bob",
		DeviceID: "device-456",
	}

	result := CaregiverToGraphQL(c)
	if result.DeviceName != nil {
		t.Errorf("DeviceName = %v, want nil", result.DeviceName)
	}
}

func TestCaregiverToGraphQL_Nil(t *testing.T) {
	result := CaregiverToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}

func TestCareSessionToGraphQL(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	completedAt := now.Add(2 * time.Hour)
	notes := "Great session"
	id := uuid.New()
	familyID := uuid.New()

	s := &domain.CareSession{
		ID:          id,
		FamilyID:    familyID,
		Status:      domain.StatusCompleted,
		StartedAt:   now,
		CompletedAt: &completedAt,
		Notes:       &notes,
	}

	result := CareSessionToGraphQL(s)

	if result.ID != id.String() {
		t.Errorf("ID = %q, want %q", result.ID, id.String())
	}
	if result.FamilyID != familyID.String() {
		t.Errorf("FamilyID = %q, want %q", result.FamilyID, familyID.String())
	}
	if result.Status != model.CareSessionStatus(domain.StatusCompleted) {
		t.Errorf("Status = %q, want %q", result.Status, domain.StatusCompleted)
	}
	if result.CompletedAt == nil || !result.CompletedAt.Equal(completedAt) {
		t.Errorf("CompletedAt = %v, want %v", result.CompletedAt, completedAt)
	}
	if result.Notes == nil || *result.Notes != "Great session" {
		t.Errorf("Notes = %v, want %q", result.Notes, "Great session")
	}
}

func TestCareSessionToGraphQL_NilOptionals(t *testing.T) {
	s := &domain.CareSession{
		ID:       uuid.New(),
		FamilyID: uuid.New(),
		Status:   domain.StatusInProgress,
	}

	result := CareSessionToGraphQL(s)
	if result.CompletedAt != nil {
		t.Errorf("CompletedAt = %v, want nil", result.CompletedAt)
	}
	if result.Notes != nil {
		t.Errorf("Notes = %v, want nil", result.Notes)
	}
}

func TestCareSessionToGraphQL_Nil(t *testing.T) {
	result := CareSessionToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}

func TestActivityToGraphQL_Feed(t *testing.T) {
	a := &domain.Activity{
		ID:           uuid.New(),
		ActivityType: domain.ActivityTypeFeed,
		CreatedAt:    time.Now(),
	}

	result := ActivityToGraphQL(a)
	feed, ok := result.(*model.FeedActivity)
	if !ok {
		t.Fatalf("expected *model.FeedActivity, got %T", result)
	}
	if feed.ID != a.ID.String() {
		t.Errorf("ID = %q, want %q", feed.ID, a.ID.String())
	}
	if feed.ActivityType != model.ActivityType(domain.ActivityTypeFeed) {
		t.Errorf("ActivityType = %q, want %q", feed.ActivityType, domain.ActivityTypeFeed)
	}
}

func TestActivityToGraphQL_Diaper(t *testing.T) {
	a := &domain.Activity{
		ID:           uuid.New(),
		ActivityType: domain.ActivityTypeDiaper,
		CreatedAt:    time.Now(),
	}

	result := ActivityToGraphQL(a)
	diaper, ok := result.(*model.DiaperActivity)
	if !ok {
		t.Fatalf("expected *model.DiaperActivity, got %T", result)
	}
	if diaper.ActivityType != model.ActivityType(domain.ActivityTypeDiaper) {
		t.Errorf("ActivityType = %q, want %q", diaper.ActivityType, domain.ActivityTypeDiaper)
	}
}

func TestActivityToGraphQL_Sleep(t *testing.T) {
	a := &domain.Activity{
		ID:           uuid.New(),
		ActivityType: domain.ActivityTypeSleep,
		CreatedAt:    time.Now(),
	}

	result := ActivityToGraphQL(a)
	sleep, ok := result.(*model.SleepActivity)
	if !ok {
		t.Fatalf("expected *model.SleepActivity, got %T", result)
	}
	if sleep.ActivityType != model.ActivityType(domain.ActivityTypeSleep) {
		t.Errorf("ActivityType = %q, want %q", sleep.ActivityType, domain.ActivityTypeSleep)
	}
}

func TestActivityToGraphQL_UnknownType(t *testing.T) {
	a := &domain.Activity{
		ID:           uuid.New(),
		ActivityType: domain.ActivityType("unknown"),
	}

	result := ActivityToGraphQL(a)
	if result != nil {
		t.Errorf("expected nil for unknown type, got %T", result)
	}
}

func TestActivityToGraphQL_Nil(t *testing.T) {
	result := ActivityToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}

func TestFeedDetailsToGraphQL_WithDuration(t *testing.T) {
	start := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	end := time.Date(2024, 1, 1, 10, 30, 0, 0, time.UTC)
	feedType := domain.FeedTypeBreastMilk
	amountMl := 120

	fd := &domain.FeedDetails{
		StartTime: start,
		EndTime:   &end,
		FeedType:  &feedType,
		AmountMl:  &amountMl,
	}

	result := FeedDetailsToGraphQL(fd)

	if !result.StartTime.Equal(start) {
		t.Errorf("StartTime = %v, want %v", result.StartTime, start)
	}
	if result.EndTime == nil || !result.EndTime.Equal(end) {
		t.Errorf("EndTime = %v, want %v", result.EndTime, end)
	}
	if result.DurationMinutes == nil || *result.DurationMinutes != 30 {
		t.Errorf("DurationMinutes = %v, want 30", result.DurationMinutes)
	}
	expectedFeedType := model.FeedTypeBreastMilk
	if result.FeedType == nil || *result.FeedType != expectedFeedType {
		t.Errorf("FeedType = %v, want %q", result.FeedType, expectedFeedType)
	}
	if result.AmountMl == nil || *result.AmountMl != 120 {
		t.Errorf("AmountMl = %v, want 120", result.AmountMl)
	}
}

func TestFeedDetailsToGraphQL_NoDuration(t *testing.T) {
	start := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	fd := &domain.FeedDetails{
		StartTime: start,
	}

	result := FeedDetailsToGraphQL(fd)

	if result.DurationMinutes != nil {
		t.Errorf("DurationMinutes = %v, want nil", result.DurationMinutes)
	}
	if result.EndTime != nil {
		t.Errorf("EndTime = %v, want nil", result.EndTime)
	}
}

func TestFeedDetailsToGraphQL_Nil(t *testing.T) {
	result := FeedDetailsToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}

func TestDomainFeedTypeToGraphQL(t *testing.T) {
	tests := []struct {
		domain   domain.FeedType
		expected model.FeedType
	}{
		{domain.FeedTypeBreastMilk, model.FeedTypeBreastMilk},
		{domain.FeedTypeFormula, model.FeedTypeFormula},
		{domain.FeedTypeSolids, model.FeedTypeSolids},
	}

	for _, tc := range tests {
		t.Run(string(tc.domain), func(t *testing.T) {
			result, err := domainFeedTypeToGraphQL(tc.domain)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != tc.expected {
				t.Errorf("got %q, want %q", result, tc.expected)
			}
			if !result.IsValid() {
				t.Errorf("result %q is not a valid GraphQL FeedType", result)
			}
		})
	}
}

func TestDomainFeedTypeToGraphQL_Unknown(t *testing.T) {
	_, err := domainFeedTypeToGraphQL(domain.FeedType("unknown"))
	if err == nil {
		t.Error("expected error for unknown feed type, got nil")
	}
}

func TestDomainQuantityUnitToGraphQL(t *testing.T) {
	tests := []struct {
		domain   string
		expected model.SolidsUnit
	}{
		{"spoons", model.SolidsUnitSpoons},
		{"bowls", model.SolidsUnitBowls},
		{"pieces", model.SolidsUnitPieces},
		{"portions", model.SolidsUnitPortions},
	}

	for _, tc := range tests {
		t.Run(tc.domain, func(t *testing.T) {
			result, err := domainQuantityUnitToGraphQL(tc.domain)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != tc.expected {
				t.Errorf("got %q, want %q", result, tc.expected)
			}
			if !result.IsValid() {
				t.Errorf("result %q is not a valid GraphQL SolidsUnit", result)
			}
		})
	}
}

func TestDomainQuantityUnitToGraphQL_Unknown(t *testing.T) {
	_, err := domainQuantityUnitToGraphQL("cups")
	if err == nil {
		t.Error("expected error for unknown quantity unit, got nil")
	}
}

func TestFeedDetailsToGraphQL_Solids(t *testing.T) {
	start := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	feedType := domain.FeedTypeSolids
	foodName := "avocado"
	qty := 3.0
	qtyUnit := "spoons"

	fd := &domain.FeedDetails{
		StartTime:    start,
		FeedType:     &feedType,
		FoodName:     &foodName,
		Quantity:     &qty,
		QuantityUnit: &qtyUnit,
	}

	result := FeedDetailsToGraphQL(fd)

	if result.FeedType == nil || *result.FeedType != model.FeedTypeSolids {
		t.Errorf("FeedType = %v, want SOLIDS", result.FeedType)
	}
	if result.FoodName == nil || *result.FoodName != "avocado" {
		t.Errorf("FoodName = %v, want avocado", result.FoodName)
	}
	if result.Quantity == nil || *result.Quantity != 3.0 {
		t.Errorf("Quantity = %v, want 3.0", result.Quantity)
	}
	if result.QuantityUnit == nil || *result.QuantityUnit != model.SolidsUnitSpoons {
		t.Errorf("QuantityUnit = %v, want SPOONS", result.QuantityUnit)
	}
	if result.AmountMl != nil {
		t.Errorf("AmountMl = %v, want nil for solids", result.AmountMl)
	}
}

func TestFeedDetailsToGraphQL_UnknownFeedType(t *testing.T) {
	start := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	feedType := domain.FeedType("unknown")

	fd := &domain.FeedDetails{
		StartTime: start,
		FeedType:  &feedType,
	}

	result := FeedDetailsToGraphQL(fd)

	if result.FeedType != nil {
		t.Errorf("FeedType = %v, want nil for unknown domain feed type", result.FeedType)
	}
}

func TestDiaperDetailsToGraphQL(t *testing.T) {
	now := time.Now().Truncate(time.Second)

	dd := &domain.DiaperDetails{
		ChangedAt: now,
		HadPoop:   true,
		HadPee:    false,
	}

	result := DiaperDetailsToGraphQL(dd)

	if !result.ChangedAt.Equal(now) {
		t.Errorf("ChangedAt = %v, want %v", result.ChangedAt, now)
	}
	if result.HadPoop != true {
		t.Error("HadPoop = false, want true")
	}
	if result.HadPee != false {
		t.Error("HadPee = true, want false")
	}
}

func TestDiaperDetailsToGraphQL_Nil(t *testing.T) {
	result := DiaperDetailsToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}

func TestSleepDetailsToGraphQL_Active(t *testing.T) {
	start := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	sd := &domain.SleepDetails{
		StartTime: start,
		// No EndTime = still sleeping
	}

	result := SleepDetailsToGraphQL(sd)

	if result.IsActive == nil || *result.IsActive != true {
		t.Errorf("IsActive = %v, want true", result.IsActive)
	}
	if result.DurationMinutes != nil {
		t.Errorf("DurationMinutes = %v, want nil", result.DurationMinutes)
	}
}

func TestSleepDetailsToGraphQL_Completed(t *testing.T) {
	start := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	end := time.Date(2024, 1, 1, 11, 30, 0, 0, time.UTC)

	sd := &domain.SleepDetails{
		StartTime: start,
		EndTime:   &end,
	}

	result := SleepDetailsToGraphQL(sd)

	if result.IsActive == nil || *result.IsActive != false {
		t.Errorf("IsActive = %v, want false", result.IsActive)
	}
	if result.DurationMinutes == nil || *result.DurationMinutes != 90 {
		t.Errorf("DurationMinutes = %v, want 90", result.DurationMinutes)
	}
}

func TestSleepDetailsToGraphQL_Nil(t *testing.T) {
	result := SleepDetailsToGraphQL(nil)
	if result != nil {
		t.Error("expected nil for nil input")
	}
}
