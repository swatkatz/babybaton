package graph

import (
	"context"
	"testing"

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
