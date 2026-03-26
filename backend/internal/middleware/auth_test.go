package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

// --- Mock AuthVerifier ---

type mockVerifier struct {
	userID string
	email  string
	err    error
}

func (m *mockVerifier) VerifyToken(ctx context.Context, token string) (string, string, error) {
	return m.userID, m.email, m.err
}

// --- Mock Store (only methods needed by middleware) ---

type mockStore struct {
	user      *domain.User
	userErr   error
	caregiver *domain.Caregiver
	cgErr     error
}

func (m *mockStore) GetUserBySupabaseID(ctx context.Context, supabaseUserID string) (*domain.User, error) {
	return m.user, m.userErr
}

func (m *mockStore) GetCaregiverByUserAndFamily(ctx context.Context, userID uuid.UUID, familyID uuid.UUID) (*domain.Caregiver, error) {
	return m.caregiver, m.cgErr
}

// Stub out remaining Store interface methods (not used by middleware)
func (m *mockStore) CreateFamilyWithCaregiver(ctx context.Context, family *domain.Family, caregiver *domain.Caregiver) error {
	return nil
}
func (m *mockStore) GetFamilyByID(ctx context.Context, id uuid.UUID) (*domain.Family, error) {
	return nil, nil
}
func (m *mockStore) GetFamilyByName(ctx context.Context, name string) (*domain.Family, error) {
	return nil, nil
}
func (m *mockStore) UpdateFamily(ctx context.Context, family *domain.Family) error { return nil }
func (m *mockStore) DeleteFamily(ctx context.Context, id uuid.UUID) error          { return nil }
func (m *mockStore) FamilyNameExists(ctx context.Context, name string) (bool, error) {
	return false, nil
}
func (m *mockStore) GetFamiliesByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Family, error) {
	return nil, nil
}
func (m *mockStore) CreateUser(ctx context.Context, user *domain.User) error { return nil }
func (m *mockStore) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return nil, nil
}
func (m *mockStore) CreateCaregiver(ctx context.Context, caregiver *domain.Caregiver) error {
	return nil
}
func (m *mockStore) GetCaregiverByID(ctx context.Context, id uuid.UUID) (*domain.Caregiver, error) {
	return nil, nil
}
func (m *mockStore) GetCaregiverByDeviceID(ctx context.Context, deviceID string) (*domain.Caregiver, error) {
	return nil, nil
}
func (m *mockStore) GetCaregiversByFamily(ctx context.Context, familyID uuid.UUID) ([]*domain.Caregiver, error) {
	return nil, nil
}
func (m *mockStore) UpdateCaregiver(ctx context.Context, caregiver *domain.Caregiver) error {
	return nil
}
func (m *mockStore) LinkCaregiverToUser(ctx context.Context, caregiverID uuid.UUID, userID uuid.UUID) error {
	return nil
}
func (m *mockStore) DeleteCaregiver(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockStore) CreateCareSession(ctx context.Context, session *domain.CareSession) error {
	return nil
}
func (m *mockStore) GetCareSessionByID(ctx context.Context, id uuid.UUID) (*domain.CareSession, error) {
	return nil, nil
}
func (m *mockStore) GetInProgressSessionForFamily(ctx context.Context, familyID uuid.UUID) (*domain.CareSession, error) {
	return nil, nil
}
func (m *mockStore) GetRecentCareSessionsForFamily(ctx context.Context, familyID uuid.UUID, limit int) ([]*domain.CareSession, error) {
	return nil, nil
}
func (m *mockStore) UpdateCareSession(ctx context.Context, session *domain.CareSession) error {
	return nil
}
func (m *mockStore) DeleteCareSession(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockStore) CreateActivity(ctx context.Context, activity *domain.Activity) error {
	return nil
}
func (m *mockStore) GetActivityByID(ctx context.Context, id uuid.UUID) (*domain.Activity, error) {
	return nil, nil
}
func (m *mockStore) GetActivitiesForSession(ctx context.Context, sessionID uuid.UUID) ([]*domain.Activity, error) {
	return nil, nil
}
func (m *mockStore) DeleteActivity(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockStore) CreateFeedDetails(ctx context.Context, details *domain.FeedDetails) error {
	return nil
}
func (m *mockStore) GetFeedDetails(ctx context.Context, activityID uuid.UUID) (*domain.FeedDetails, error) {
	return nil, nil
}
func (m *mockStore) GetRecentFeedDetailsForFamily(ctx context.Context, familyID uuid.UUID, limit int) ([]*domain.FeedDetails, error) {
	return nil, nil
}
func (m *mockStore) UpdateFeedDetails(ctx context.Context, details *domain.FeedDetails) error {
	return nil
}
func (m *mockStore) CreateDiaperDetails(ctx context.Context, details *domain.DiaperDetails) error {
	return nil
}
func (m *mockStore) GetDiaperDetails(ctx context.Context, activityID uuid.UUID) (*domain.DiaperDetails, error) {
	return nil, nil
}
func (m *mockStore) UpdateDiaperDetails(ctx context.Context, details *domain.DiaperDetails) error {
	return nil
}
func (m *mockStore) CreateSleepDetails(ctx context.Context, details *domain.SleepDetails) error {
	return nil
}
func (m *mockStore) GetSleepDetails(ctx context.Context, activityID uuid.UUID) (*domain.SleepDetails, error) {
	return nil, nil
}
func (m *mockStore) UpdateSleepDetails(ctx context.Context, details *domain.SleepDetails) error {
	return nil
}
func (m *mockStore) Close() error { return nil }

// ==================== Legacy AuthMiddleware Tests ====================

func TestAuthMiddleware_ParsesAllHeaders(t *testing.T) {
	caregiverID := uuid.New()
	familyID := uuid.New()
	timezone := "America/New_York"

	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("X-Caregiver-Id", caregiverID.String())
	req.Header.Set("X-Family-Id", familyID.String())
	req.Header.Set("X-Timezone", timezone)

	rr := httptest.NewRecorder()
	AuthMiddleware(inner).ServeHTTP(rr, req)

	gotCaregiverID, ok := GetCaregiverID(capturedCtx)
	if !ok {
		t.Fatal("expected caregiver ID in context")
	}
	if gotCaregiverID != caregiverID {
		t.Errorf("caregiver ID = %v, want %v", gotCaregiverID, caregiverID)
	}

	gotFamilyID, ok := GetFamilyID(capturedCtx)
	if !ok {
		t.Fatal("expected family ID in context")
	}
	if gotFamilyID != familyID {
		t.Errorf("family ID = %v, want %v", gotFamilyID, familyID)
	}

	gotTz := GetTimezone(capturedCtx)
	if gotTz != timezone {
		t.Errorf("timezone = %q, want %q", gotTz, timezone)
	}
}

func TestAuthMiddleware_MissingHeaders(t *testing.T) {
	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	rr := httptest.NewRecorder()
	AuthMiddleware(inner).ServeHTTP(rr, req)

	_, ok := GetCaregiverID(capturedCtx)
	if ok {
		t.Error("expected no caregiver ID in context")
	}

	_, ok = GetFamilyID(capturedCtx)
	if ok {
		t.Error("expected no family ID in context")
	}
}

func TestAuthMiddleware_DefaultTimezoneUTC(t *testing.T) {
	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	rr := httptest.NewRecorder()
	AuthMiddleware(inner).ServeHTTP(rr, req)

	gotTz := GetTimezone(capturedCtx)
	if gotTz != "UTC" {
		t.Errorf("timezone = %q, want %q", gotTz, "UTC")
	}
}

func TestAuthMiddleware_InvalidUUIDs(t *testing.T) {
	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("X-Caregiver-Id", "not-a-uuid")
	req.Header.Set("X-Family-Id", "also-not-a-uuid")

	rr := httptest.NewRecorder()
	AuthMiddleware(inner).ServeHTTP(rr, req)

	_, ok := GetCaregiverID(capturedCtx)
	if ok {
		t.Error("expected no caregiver ID for invalid UUID")
	}

	_, ok = GetFamilyID(capturedCtx)
	if ok {
		t.Error("expected no family ID for invalid UUID")
	}
}

func TestRequireAuth_Success(t *testing.T) {
	caregiverID := uuid.New()
	familyID := uuid.New()

	ctx := context.Background()
	ctx = context.WithValue(ctx, CaregiverIDKey, caregiverID)
	ctx = context.WithValue(ctx, FamilyIDKey, familyID)

	gotCaregiver, gotFamily, err := RequireAuth(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotCaregiver != caregiverID {
		t.Errorf("caregiver ID = %v, want %v", gotCaregiver, caregiverID)
	}
	if gotFamily != familyID {
		t.Errorf("family ID = %v, want %v", gotFamily, familyID)
	}
}

func TestRequireAuth_MissingCaregiverID(t *testing.T) {
	familyID := uuid.New()
	ctx := context.Background()
	ctx = context.WithValue(ctx, FamilyIDKey, familyID)

	_, _, err := RequireAuth(ctx)
	if err == nil {
		t.Fatal("expected error for missing caregiver ID")
	}
}

func TestRequireAuth_MissingFamilyID(t *testing.T) {
	caregiverID := uuid.New()
	ctx := context.Background()
	ctx = context.WithValue(ctx, CaregiverIDKey, caregiverID)

	_, _, err := RequireAuth(ctx)
	if err == nil {
		t.Fatal("expected error for missing family ID")
	}
}

func TestRequireAuth_EmptyContext(t *testing.T) {
	ctx := context.Background()

	_, _, err := RequireAuth(ctx)
	if err == nil {
		t.Fatal("expected error for empty context")
	}
}

func TestGetTimezone_FallbackForEmptyContext(t *testing.T) {
	ctx := context.Background()
	tz := GetTimezone(ctx)
	if tz != "UTC" {
		t.Errorf("timezone = %q, want %q", tz, "UTC")
	}
}

// ==================== DualAuthMiddleware Tests ====================

func newTestDualAuth(verifier *mockVerifier, store *mockStore) *DualAuthMiddleware {
	return NewDualAuthMiddleware(verifier, store)
}

func TestDualAuth_ValidJWT_ResolvesUserAndCaregiver(t *testing.T) {
	userID := uuid.New()
	caregiverID := uuid.New()
	familyID := uuid.New()

	user := &domain.User{ID: userID, SupabaseUserID: "sup-123", Email: "test@example.com"}
	caregiver := &domain.Caregiver{ID: caregiverID, FamilyID: familyID, UserID: &userID}

	m := newTestDualAuth(
		&mockVerifier{userID: "sup-123", email: "test@example.com"},
		&mockStore{user: user, caregiver: caregiver},
	)

	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	req.Header.Set("X-Family-Id", familyID.String())
	req.Header.Set("X-Timezone", "America/Chicago")

	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	// User context should be set
	gotUserID, ok := GetUserID(capturedCtx)
	if !ok {
		t.Fatal("expected user ID in context")
	}
	if gotUserID != userID {
		t.Errorf("user ID = %v, want %v", gotUserID, userID)
	}

	gotUser, ok := GetUser(capturedCtx)
	if !ok {
		t.Fatal("expected user in context")
	}
	if gotUser.Email != "test@example.com" {
		t.Errorf("user email = %q, want %q", gotUser.Email, "test@example.com")
	}

	// Caregiver/family should be resolved
	gotCaregiverID, ok := GetCaregiverID(capturedCtx)
	if !ok {
		t.Fatal("expected caregiver ID in context")
	}
	if gotCaregiverID != caregiverID {
		t.Errorf("caregiver ID = %v, want %v", gotCaregiverID, caregiverID)
	}

	gotFamilyID, ok := GetFamilyID(capturedCtx)
	if !ok {
		t.Fatal("expected family ID in context")
	}
	if gotFamilyID != familyID {
		t.Errorf("family ID = %v, want %v", gotFamilyID, familyID)
	}

	// Timezone
	gotTz := GetTimezone(capturedCtx)
	if gotTz != "America/Chicago" {
		t.Errorf("timezone = %q, want %q", gotTz, "America/Chicago")
	}
}

func TestDualAuth_ValidJWT_WithoutFamilyID(t *testing.T) {
	userID := uuid.New()
	user := &domain.User{ID: userID, SupabaseUserID: "sup-123", Email: "test@example.com"}

	m := newTestDualAuth(
		&mockVerifier{userID: "sup-123", email: "test@example.com"},
		&mockStore{user: user},
	)

	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("Authorization", "Bearer valid-token")

	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	// User context should be set
	_, ok := GetUserID(capturedCtx)
	if !ok {
		t.Fatal("expected user ID in context")
	}

	// No caregiver/family without X-Family-Id
	_, ok = GetCaregiverID(capturedCtx)
	if ok {
		t.Error("expected no caregiver ID without X-Family-Id header")
	}

	_, ok = GetFamilyID(capturedCtx)
	if ok {
		t.Error("expected no family ID without X-Family-Id header")
	}
}

func TestDualAuth_ExpiredJWT_Returns401(t *testing.T) {
	m := newTestDualAuth(
		&mockVerifier{err: fmt.Errorf("token expired")},
		&mockStore{},
	)

	handlerCalled := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("Authorization", "Bearer expired-token")

	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if handlerCalled {
		t.Error("handler should not be called on JWT failure")
	}
}

func TestDualAuth_InvalidJWT_Returns401(t *testing.T) {
	m := newTestDualAuth(
		&mockVerifier{err: fmt.Errorf("invalid token")},
		&mockStore{},
	)

	handlerCalled := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("Authorization", "Bearer bad-token")

	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if handlerCalled {
		t.Error("handler should not be called on JWT failure")
	}
}

func TestDualAuth_ValidJWT_UserNotFound_Returns401(t *testing.T) {
	m := newTestDualAuth(
		&mockVerifier{userID: "sup-unknown", email: "test@example.com"},
		&mockStore{userErr: fmt.Errorf("user not found")},
	)

	handlerCalled := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("Authorization", "Bearer valid-token")

	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if handlerCalled {
		t.Error("handler should not be called when user not found")
	}
}

func TestDualAuth_FallsBackToHeaders_WhenNoBearer(t *testing.T) {
	caregiverID := uuid.New()
	familyID := uuid.New()

	m := newTestDualAuth(
		&mockVerifier{},
		&mockStore{},
	)

	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	req.Header.Set("X-Caregiver-Id", caregiverID.String())
	req.Header.Set("X-Family-Id", familyID.String())
	req.Header.Set("X-Timezone", "Europe/London")

	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	gotCaregiverID, ok := GetCaregiverID(capturedCtx)
	if !ok {
		t.Fatal("expected caregiver ID in context")
	}
	if gotCaregiverID != caregiverID {
		t.Errorf("caregiver ID = %v, want %v", gotCaregiverID, caregiverID)
	}

	gotFamilyID, ok := GetFamilyID(capturedCtx)
	if !ok {
		t.Fatal("expected family ID in context")
	}
	if gotFamilyID != familyID {
		t.Errorf("family ID = %v, want %v", gotFamilyID, familyID)
	}

	// No user context on header-based auth
	_, ok = GetUserID(capturedCtx)
	if ok {
		t.Error("expected no user ID on header-based auth")
	}

	gotTz := GetTimezone(capturedCtx)
	if gotTz != "Europe/London" {
		t.Errorf("timezone = %q, want %q", gotTz, "Europe/London")
	}
}

func TestDualAuth_NoAuth_PassesThrough(t *testing.T) {
	m := newTestDualAuth(
		&mockVerifier{},
		&mockStore{},
	)

	var capturedCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})

	req := httptest.NewRequest("POST", "/query", nil)
	rr := httptest.NewRecorder()
	m.Handler(inner).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	_, ok := GetCaregiverID(capturedCtx)
	if ok {
		t.Error("expected no caregiver ID")
	}
	_, ok = GetFamilyID(capturedCtx)
	if ok {
		t.Error("expected no family ID")
	}
	_, ok = GetUserID(capturedCtx)
	if ok {
		t.Error("expected no user ID")
	}

	gotTz := GetTimezone(capturedCtx)
	if gotTz != "UTC" {
		t.Errorf("timezone = %q, want %q", gotTz, "UTC")
	}
}

// ==================== extractBearerToken Tests ====================

func TestExtractBearerToken(t *testing.T) {
	tests := []struct {
		name   string
		header string
		want   string
	}{
		{"valid bearer", "Bearer my-token", "my-token"},
		{"case insensitive", "bearer my-token", "my-token"},
		{"BEARER uppercase", "BEARER my-token", "my-token"},
		{"empty header", "", ""},
		{"no bearer prefix", "Basic abc123", ""},
		{"bearer only no token", "Bearer ", ""},
		{"token with spaces trimmed", "Bearer  my-token ", "my-token"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/query", nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			got := extractBearerToken(req)
			if got != tt.want {
				t.Errorf("extractBearerToken() = %q, want %q", got, tt.want)
			}
		})
	}
}

// ==================== Context Getter Tests ====================

func TestGetUserID_Success(t *testing.T) {
	userID := uuid.New()
	ctx := context.WithValue(context.Background(), UserIDKey, userID)

	got, ok := GetUserID(ctx)
	if !ok {
		t.Fatal("expected user ID in context")
	}
	if got != userID {
		t.Errorf("user ID = %v, want %v", got, userID)
	}
}

func TestGetUserID_Missing(t *testing.T) {
	_, ok := GetUserID(context.Background())
	if ok {
		t.Error("expected no user ID in empty context")
	}
}

func TestGetUser_Success(t *testing.T) {
	user := &domain.User{ID: uuid.New(), Email: "test@example.com"}
	ctx := context.WithValue(context.Background(), UserKey, user)

	got, ok := GetUser(ctx)
	if !ok {
		t.Fatal("expected user in context")
	}
	if got.Email != "test@example.com" {
		t.Errorf("user email = %q, want %q", got.Email, "test@example.com")
	}
}

func TestGetUser_Missing(t *testing.T) {
	_, ok := GetUser(context.Background())
	if ok {
		t.Error("expected no user in empty context")
	}
}
