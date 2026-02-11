package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

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
