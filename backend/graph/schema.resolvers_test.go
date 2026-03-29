package graph

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
	"github.com/swatkatz/babybaton/backend/internal/middleware"
)

// withUserID sets a user ID in context (simulates JWT auth path)
func withUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, middleware.UserIDKey, userID)
}

// withAuth sets caregiver and family IDs in context (simulates legacy auth path)
func withAuth(ctx context.Context, caregiverID, familyID uuid.UUID) context.Context {
	ctx = context.WithValue(ctx, middleware.CaregiverIDKey, caregiverID)
	ctx = context.WithValue(ctx, middleware.FamilyIDKey, familyID)
	return ctx
}

// ==================== CreateFamily Tests ====================

func TestCreateFamily_DeviceBased(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	deviceID := "test-device-123"
	deviceName := "iPhone"
	result, err := mr.CreateFamily(ctx, "TestFamily", "password123", "Baby", "Mom", &deviceID, &deviceName)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Fatalf("expected success, got error: %v", *result.Error)
	}
	if result.Family == nil {
		t.Fatal("expected family in result")
	}
	if result.Caregiver == nil {
		t.Fatal("expected caregiver in result")
	}
	if result.Family.Name != "TestFamily" {
		t.Errorf("expected family name %q, got %q", "TestFamily", result.Family.Name)
	}
}

func TestCreateFamily_DeviceBased_MissingDeviceID(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	result, err := mr.CreateFamily(ctx, "TestFamily", "password123", "Baby", "Mom", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Fatal("expected failure when deviceId is missing for device-based auth")
	}
	if result.Error == nil || *result.Error != "deviceId is required for device-based authentication" {
		t.Errorf("unexpected error message: %v", result.Error)
	}
}

func TestCreateFamily_UserBased(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}

	userID := uuid.New()
	ctx := withUserID(context.Background(), userID)

	result, err := mr.CreateFamily(ctx, "TestFamily", "password123", "Baby", "Mom", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Fatalf("expected success, got error: %v", *result.Error)
	}
	if result.Family == nil || result.Caregiver == nil {
		t.Fatal("expected family and caregiver in result")
	}

	// Verify the caregiver was created with user_id (check the store)
	if store.lastCreatedCaregiver == nil {
		t.Fatal("expected caregiver to be stored")
	}
	if store.lastCreatedCaregiver.UserID == nil || *store.lastCreatedCaregiver.UserID != userID {
		t.Error("expected caregiver to be linked to user")
	}
	if store.lastCreatedCaregiver.DeviceID != nil {
		t.Error("expected no device ID for user-based caregiver")
	}
}

func TestCreateFamily_ShortPassword(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	deviceID := "test-device"
	result, err := mr.CreateFamily(ctx, "TestFamily", "short", "Baby", "Mom", &deviceID, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Fatal("expected failure for short password")
	}
}

func TestCreateFamily_DuplicateName(t *testing.T) {
	store := newMockStore()
	store.familyNameExists = true
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	deviceID := "test-device"
	result, err := mr.CreateFamily(ctx, "Existing", "password123", "Baby", "Mom", &deviceID, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Fatal("expected failure for duplicate family name")
	}
}

// ==================== JoinFamily Tests ====================

func TestJoinFamily_DeviceBased_NewDevice(t *testing.T) {
	familyID := uuid.New()
	store := newMockStore()
	store.family = &domain.Family{
		ID:           familyID,
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}
	store.getCaregiverByDeviceIDErr = errNotFound

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	deviceID := "new-device"
	result, err := mr.JoinFamily(ctx, "TestFamily", "password123", "Dad", &deviceID, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Fatalf("expected success, got error: %v", *result.Error)
	}
	if result.Caregiver == nil {
		t.Fatal("expected caregiver in result")
	}
}

func TestJoinFamily_DeviceBased_ExistingDeviceSameFamily(t *testing.T) {
	familyID := uuid.New()
	caregiverID := uuid.New()
	deviceID := "existing-device"

	store := newMockStore()
	store.family = &domain.Family{
		ID:           familyID,
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}
	store.caregiverByDeviceID = &domain.Caregiver{
		ID:       caregiverID,
		FamilyID: familyID,
		Name:     "Mom",
		DeviceID: &deviceID,
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	result, err := mr.JoinFamily(ctx, "TestFamily", "password123", "Mom", &deviceID, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Fatal("expected success for re-auth")
	}
	if result.Caregiver.ID != caregiverID.String() {
		t.Error("expected existing caregiver to be returned")
	}
}

func TestJoinFamily_DeviceBased_ExistingDeviceDifferentFamily(t *testing.T) {
	familyID := uuid.New()
	otherFamilyID := uuid.New()
	deviceID := "existing-device"

	store := newMockStore()
	store.family = &domain.Family{
		ID:           familyID,
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}
	store.caregiverByDeviceID = &domain.Caregiver{
		ID:       uuid.New(),
		FamilyID: otherFamilyID,
		Name:     "Mom",
		DeviceID: &deviceID,
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	result, err := mr.JoinFamily(ctx, "TestFamily", "password123", "Mom", &deviceID, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Fatal("expected failure when device belongs to different family")
	}
}

func TestJoinFamily_DeviceBased_MissingDeviceID(t *testing.T) {
	store := newMockStore()
	store.family = &domain.Family{
		ID:           uuid.New(),
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	result, err := mr.JoinFamily(ctx, "TestFamily", "password123", "Dad", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Fatal("expected failure when deviceId is missing")
	}
}

func TestJoinFamily_UserBased_NewUser(t *testing.T) {
	familyID := uuid.New()
	userID := uuid.New()

	store := newMockStore()
	store.family = &domain.Family{
		ID:           familyID,
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}
	store.getCaregiverByUserAndFamilyErr = errNotFound

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := withUserID(context.Background(), userID)

	result, err := mr.JoinFamily(ctx, "TestFamily", "password123", "Dad", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Fatalf("expected success, got error: %v", *result.Error)
	}
	if store.lastCreatedCaregiver == nil {
		t.Fatal("expected caregiver to be created")
	}
	if store.lastCreatedCaregiver.UserID == nil || *store.lastCreatedCaregiver.UserID != userID {
		t.Error("expected caregiver to be linked to user")
	}
}

func TestJoinFamily_UserBased_ExistingUser(t *testing.T) {
	familyID := uuid.New()
	userID := uuid.New()
	caregiverID := uuid.New()

	store := newMockStore()
	store.family = &domain.Family{
		ID:           familyID,
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}
	store.caregiverByUserAndFamily = &domain.Caregiver{
		ID:       caregiverID,
		FamilyID: familyID,
		UserID:   &userID,
		Name:     "Dad",
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := withUserID(context.Background(), userID)

	result, err := mr.JoinFamily(ctx, "TestFamily", "password123", "Dad", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Fatal("expected success for re-auth")
	}
	if result.Caregiver.ID != caregiverID.String() {
		t.Error("expected existing caregiver to be returned")
	}
}

func TestJoinFamily_WrongPassword(t *testing.T) {
	store := newMockStore()
	store.family = &domain.Family{
		ID:           uuid.New(),
		Name:         "TestFamily",
		PasswordHash: hashPassword("password123"),
		Password:     "password123",
		BabyName:     "Baby",
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	deviceID := "test-device"
	result, err := mr.JoinFamily(ctx, "TestFamily", "wrongpassword", "Dad", &deviceID, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Fatal("expected failure for wrong password")
	}
}

// ==================== LinkCaregiverToUser Tests ====================

func TestLinkCaregiverToUser_Success(t *testing.T) {
	userID := uuid.New()
	caregiverID := uuid.New()
	familyID := uuid.New()

	store := newMockStore()
	store.caregiverByID = &domain.Caregiver{
		ID:       caregiverID,
		FamilyID: familyID,
		Name:     "Mom",
		UserID:   nil, // not linked yet
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := withUserID(context.Background(), userID)

	result, err := mr.LinkCaregiverToUser(ctx, caregiverID.String())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected caregiver result")
	}
	if !store.linkCaregiverToUserCalled {
		t.Error("expected LinkCaregiverToUser to be called on store")
	}
}

func TestLinkCaregiverToUser_NotAuthenticated(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background() // no user in context

	_, err := mr.LinkCaregiverToUser(ctx, uuid.New().String())
	if err == nil {
		t.Fatal("expected error for unauthenticated request")
	}
}

func TestLinkCaregiverToUser_AlreadyLinked(t *testing.T) {
	userID := uuid.New()
	otherUserID := uuid.New()
	caregiverID := uuid.New()

	store := newMockStore()
	store.caregiverByID = &domain.Caregiver{
		ID:     caregiverID,
		Name:   "Mom",
		UserID: &otherUserID, // already linked
	}

	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := withUserID(context.Background(), userID)

	_, err := mr.LinkCaregiverToUser(ctx, caregiverID.String())
	if err == nil {
		t.Fatal("expected error for already-linked caregiver")
	}
}

func TestLinkCaregiverToUser_InvalidCaregiverID(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := withUserID(context.Background(), uuid.New())

	_, err := mr.LinkCaregiverToUser(ctx, "not-a-uuid")
	if err == nil {
		t.Fatal("expected error for invalid caregiver ID")
	}
}

// ==================== GetMyFamilies Tests ====================

func TestGetMyFamilies_Success(t *testing.T) {
	userID := uuid.New()
	family1 := &domain.Family{ID: uuid.New(), Name: "Family1", BabyName: "Baby1", Password: "pass1"}
	family2 := &domain.Family{ID: uuid.New(), Name: "Family2", BabyName: "Baby2", Password: "pass2"}

	store := newMockStore()
	store.familiesByUser = []*domain.Family{family1, family2}

	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withUserID(context.Background(), userID)

	result, err := qr.GetMyFamilies(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 families, got %d", len(result))
	}
	if result[0].Name != "Family1" {
		t.Errorf("expected first family name %q, got %q", "Family1", result[0].Name)
	}
}

func TestGetMyFamilies_NotAuthenticated(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := context.Background()

	_, err := qr.GetMyFamilies(ctx)
	if err == nil {
		t.Fatal("expected error for unauthenticated request")
	}
}

func TestGetMyFamilies_Empty(t *testing.T) {
	userID := uuid.New()
	store := newMockStore()
	store.familiesByUser = []*domain.Family{}

	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withUserID(context.Background(), userID)

	result, err := qr.GetMyFamilies(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Fatalf("expected 0 families, got %d", len(result))
	}
}

// ==================== LeaveFamily Tests ====================

func TestLeaveFamily_Success(t *testing.T) {
	caregiverID := uuid.New()
	familyID := uuid.New()

	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := mr.LeaveFamily(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result {
		t.Fatal("expected true for successful leave")
	}
	if !store.deleteCaregiverCalled {
		t.Error("expected DeleteCaregiver to be called")
	}
}

func TestLeaveFamily_NotAuthenticated(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	mr := &mutationResolver{resolver}
	ctx := context.Background()

	_, err := mr.LeaveFamily(ctx)
	if err == nil {
		t.Fatal("expected error for unauthenticated request")
	}
}

// ==================== GetBabyStatus Tests ====================

func TestGetBabyStatus_AllTypesPresent(t *testing.T) {
	feedActivityID := uuid.New()
	diaperActivityID := uuid.New()
	sleepActivityID := uuid.New()
	caregiverID := uuid.New()
	familyID := uuid.New()

	store := newMockStore()
	store.latestActivityByType = map[domain.ActivityType]*domain.Activity{
		domain.ActivityTypeFeed: {
			ID:           feedActivityID,
			ActivityType: domain.ActivityTypeFeed,
			CreatedAt:    testing_time(),
		},
		domain.ActivityTypeDiaper: {
			ID:           diaperActivityID,
			ActivityType: domain.ActivityTypeDiaper,
			CreatedAt:    testing_time(),
		},
		domain.ActivityTypeSleep: {
			ID:           sleepActivityID,
			ActivityType: domain.ActivityTypeSleep,
			CreatedAt:    testing_time(),
		},
	}
	store.feedDetails = &domain.FeedDetails{
		ID:         uuid.New(),
		ActivityID: feedActivityID,
		StartTime:  testing_time(),
	}
	store.diaperDetails = &domain.DiaperDetails{
		ID:         uuid.New(),
		ActivityID: diaperActivityID,
		ChangedAt:  testing_time(),
		HadPoop:    true,
		HadPee:     true,
	}
	store.sleepDetails = &domain.SleepDetails{
		ID:         uuid.New(),
		ActivityID: sleepActivityID,
		StartTime:  testing_time(),
	}

	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetBabyStatus(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.LastFeed == nil {
		t.Error("expected LastFeed to be non-nil")
	}
	if result.LastDiaper == nil {
		t.Error("expected LastDiaper to be non-nil")
	}
	if result.LastSleep == nil {
		t.Error("expected LastSleep to be non-nil")
	}
}

func TestGetBabyStatus_SomeTypesMissing(t *testing.T) {
	feedActivityID := uuid.New()
	caregiverID := uuid.New()
	familyID := uuid.New()

	store := newMockStore()
	store.latestActivityByType = map[domain.ActivityType]*domain.Activity{
		domain.ActivityTypeFeed: {
			ID:           feedActivityID,
			ActivityType: domain.ActivityTypeFeed,
			CreatedAt:    testing_time(),
		},
	}
	store.feedDetails = &domain.FeedDetails{
		ID:         uuid.New(),
		ActivityID: feedActivityID,
		StartTime:  testing_time(),
	}

	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetBabyStatus(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.LastFeed == nil {
		t.Error("expected LastFeed to be non-nil")
	}
	if result.LastDiaper != nil {
		t.Error("expected LastDiaper to be nil")
	}
	if result.LastSleep != nil {
		t.Error("expected LastSleep to be nil")
	}
}

func TestGetBabyStatus_NoActivities(t *testing.T) {
	caregiverID := uuid.New()
	familyID := uuid.New()

	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetBabyStatus(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.LastFeed != nil {
		t.Error("expected LastFeed to be nil")
	}
	if result.LastDiaper != nil {
		t.Error("expected LastDiaper to be nil")
	}
	if result.LastSleep != nil {
		t.Error("expected LastSleep to be nil")
	}
}

func TestGetBabyStatus_Unauthenticated(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := context.Background()

	_, err := qr.GetBabyStatus(ctx)
	if err == nil {
		t.Fatal("expected error for unauthenticated request")
	}
}

func testing_time() time.Time {
	return time.Date(2026, 3, 28, 12, 0, 0, 0, time.UTC)
}

// ==================== GetCareSessionHistory Tests ====================

func makeTestSessions(familyID, caregiverID uuid.UUID, count int) []*domain.CareSession {
	now := time.Now().UTC()
	sessions := make([]*domain.CareSession, count)
	for i := 0; i < count; i++ {
		sessions[i] = &domain.CareSession{
			ID:          uuid.New(),
			CaregiverID: caregiverID,
			FamilyID:    familyID,
			Status:      domain.StatusCompleted,
			StartedAt:   now.Add(time.Duration(-i) * time.Hour),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	}
	return sessions
}

func TestGetCareSessionHistory_FirstPage(t *testing.T) {
	familyID := uuid.New()
	caregiverID := uuid.New()
	sessions := makeTestSessions(familyID, caregiverID, 3)

	store := newMockStore()
	store.caregiverByID = &domain.Caregiver{ID: caregiverID, FamilyID: familyID, Name: "Test"}
	// Mock returns first+1 = 3 sessions to indicate hasNextPage
	store.careSessionHistory = sessions
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetCareSessionHistory(ctx, 2, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Edges) != 2 {
		t.Fatalf("expected 2 edges, got %d", len(result.Edges))
	}
	if !result.PageInfo.HasNextPage {
		t.Error("expected hasNextPage to be true")
	}
	if result.PageInfo.EndCursor == nil {
		t.Error("expected endCursor to be set")
	}
}

func TestGetCareSessionHistory_LastPage(t *testing.T) {
	familyID := uuid.New()
	caregiverID := uuid.New()
	sessions := makeTestSessions(familyID, caregiverID, 1)

	store := newMockStore()
	store.caregiverByID = &domain.Caregiver{ID: caregiverID, FamilyID: familyID, Name: "Test"}
	store.careSessionHistory = sessions
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetCareSessionHistory(ctx, 2, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Edges) != 1 {
		t.Fatalf("expected 1 edge, got %d", len(result.Edges))
	}
	if result.PageInfo.HasNextPage {
		t.Error("expected hasNextPage to be false")
	}
}

func TestGetCareSessionHistory_EmptyResults(t *testing.T) {
	familyID := uuid.New()
	caregiverID := uuid.New()

	store := newMockStore()
	store.careSessionHistory = []*domain.CareSession{}
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetCareSessionHistory(ctx, 10, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Edges) != 0 {
		t.Errorf("expected 0 edges, got %d", len(result.Edges))
	}
	if result.PageInfo.HasNextPage {
		t.Error("expected hasNextPage to be false")
	}
	if result.PageInfo.EndCursor != nil {
		t.Error("expected endCursor to be nil")
	}
}

func TestGetCareSessionHistory_NotAuthenticated(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := context.Background() // no auth

	_, err := qr.GetCareSessionHistory(ctx, 10, nil)
	if err == nil {
		t.Fatal("expected error for unauthenticated request")
	}
}

func TestGetCareSessionHistory_EdgesHaveCursors(t *testing.T) {
	familyID := uuid.New()
	caregiverID := uuid.New()
	sessions := makeTestSessions(familyID, caregiverID, 2)

	store := newMockStore()
	store.caregiverByID = &domain.Caregiver{ID: caregiverID, FamilyID: familyID, Name: "Test"}
	store.careSessionHistory = sessions
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.GetCareSessionHistory(ctx, 10, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for i, edge := range result.Edges {
		if edge.Cursor == "" {
			t.Errorf("edge %d has empty cursor", i)
		}
		if edge.Node == nil {
			t.Errorf("edge %d has nil node", i)
		}
	}
}

// ==================== Predictions Tests ====================

func withTimezone(ctx context.Context, tz string) context.Context {
	return context.WithValue(ctx, middleware.TimezoneKey, tz)
}

func TestPredictions_NoAuth_ReturnsError(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}

	_, err := qr.Predictions(context.Background())
	if err == nil {
		t.Error("expected error when not authenticated")
	}
}

func TestPredictions_WithFeedData_ReturnsPredictions(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}

	caregiverID := uuid.New()
	familyID := uuid.New()
	ctx := withAuth(context.Background(), caregiverID, familyID)
	ctx = withTimezone(ctx, "America/Los_Angeles")

	now := time.Now()
	breastMilk := domain.FeedTypeBreastMilk

	// Provide 10 feeds every ~3 hours during daytime
	var feeds []*domain.FeedDetails
	for i := range 10 {
		startTime := now.Add(-time.Duration(i) * 3 * time.Hour)
		amt := 120
		feeds = append(feeds, &domain.FeedDetails{
			ID:        uuid.New(),
			StartTime: startTime,
			FeedType:  &breastMilk,
			AmountMl:  &amt,
		})
	}
	store.recentFeedDetails = feeds

	result, err := qr.Predictions(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) == 0 {
		t.Fatal("expected at least 1 prediction")
	}

	hasNextFeed := false
	for _, p := range result {
		if p.PredictionType.String() == "NEXT_FEED" {
			hasNextFeed = true
			break
		}
	}
	if !hasNextFeed {
		t.Error("expected NEXT_FEED prediction")
	}
}

func TestPredictions_WithFeedAndSleepData_ReturnsMultipleTypes(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}

	caregiverID := uuid.New()
	familyID := uuid.New()
	ctx := withAuth(context.Background(), caregiverID, familyID)
	ctx = withTimezone(ctx, "America/Los_Angeles")

	now := time.Now()
	breastMilk := domain.FeedTypeBreastMilk

	// Feeds
	var feeds []*domain.FeedDetails
	for i := range 12 {
		startTime := now.Add(-time.Duration(i) * 3 * time.Hour)
		amt := 120
		feeds = append(feeds, &domain.FeedDetails{
			ID:        uuid.New(),
			StartTime: startTime,
			FeedType:  &breastMilk,
			AmountMl:  &amt,
		})
	}
	store.recentFeedDetails = feeds

	// Naps + overnight
	var sleeps []*domain.SleepDetails
	for i := range 5 {
		start := now.Add(-time.Duration(1+i*4) * time.Hour)
		end := start.Add(90 * time.Minute)
		dur := 90
		sleeps = append(sleeps, &domain.SleepDetails{
			ID:              uuid.New(),
			StartTime:       start,
			EndTime:         &end,
			DurationMinutes: &dur,
		})
	}
	// Add overnight sleeps
	for i := range 2 {
		start := now.Add(-time.Duration(24+i*24) * time.Hour)
		end := start.Add(600 * time.Minute)
		dur := 600
		sleeps = append(sleeps, &domain.SleepDetails{
			ID:              uuid.New(),
			StartTime:       start,
			EndTime:         &end,
			DurationMinutes: &dur,
		})
	}
	store.recentSleepDetails = sleeps

	result, err := qr.Predictions(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	types := make(map[string]bool)
	for _, p := range result {
		types[p.PredictionType.String()] = true
	}

	if !types["NEXT_FEED"] {
		t.Error("expected NEXT_FEED prediction type")
	}
	if len(types) < 2 {
		t.Errorf("expected multiple prediction types, got %d: %v", len(types), types)
	}
}

func TestPredictions_StoreError_ReturnsError(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}

	caregiverID := uuid.New()
	familyID := uuid.New()
	ctx := withAuth(context.Background(), caregiverID, familyID)

	store.recentFeedErr = fmt.Errorf("database connection failed")

	_, err := qr.Predictions(ctx)
	if err == nil {
		t.Error("expected error when store fails")
	}
}

func TestPredictions_FreshCache_ReturnsCached(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}

	caregiverID := uuid.New()
	familyID := uuid.New()
	ctx := withAuth(context.Background(), caregiverID, familyID)

	now := time.Now()
	confidence := domain.PredictionConfidenceHigh
	reasoning := "cached prediction"

	// Set up existing fresh predictions (computed less than 5 min ago)
	store.predictions = []*domain.Prediction{
		{
			ID:             uuid.New(),
			FamilyID:       familyID,
			ActivityType:   domain.ActivityTypeFeed,
			PredictionType: domain.PredictionTypeNextFeed,
			PredictedTime:  now.Add(2 * time.Hour),
			Status:         domain.PredictionStatusUpcoming,
			Confidence:     &confidence,
			Reasoning:      &reasoning,
			ComputedAt:     now.Add(-2 * time.Minute), // 2 minutes ago = fresh
			CreatedAt:      now.Add(-2 * time.Minute),
		},
	}

	result, err := qr.Predictions(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return the cached prediction without recomputing
	if len(result) != 1 {
		t.Fatalf("expected 1 cached prediction, got %d", len(result))
	}
	if result[0].Reasoning == nil || *result[0].Reasoning != "cached prediction" {
		t.Error("expected cached prediction to be returned")
	}
}

func TestPredictions_NoData_ReturnsEmpty(t *testing.T) {
	store := newMockStore()
	resolver := NewResolver(store)
	qr := &queryResolver{resolver}

	caregiverID := uuid.New()
	familyID := uuid.New()
	ctx := withAuth(context.Background(), caregiverID, familyID)

	result, err := qr.Predictions(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 predictions for new family, got %d", len(result))
	}
}
