package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

type contextKey string

const (
	CaregiverIDKey contextKey = "caregiverId"
	FamilyIDKey    contextKey = "familyId"
)

// AuthMiddleware extracts caregiver and family IDs from headers
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Extract caregiver ID
		caregiverIDStr := r.Header.Get("X-Caregiver-Id")
		if caregiverIDStr != "" {
			caregiverID, err := uuid.Parse(caregiverIDStr)
			if err == nil {
				ctx = context.WithValue(ctx, CaregiverIDKey, caregiverID)
			}
		}

		// Extract family ID
		familyIDStr := r.Header.Get("X-Family-Id")
		if familyIDStr != "" {
			familyID, err := uuid.Parse(familyIDStr)
			if err == nil {
				ctx = context.WithValue(ctx, FamilyIDKey, familyID)
			}
		}

		// Pass modified context to next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetCaregiverID extracts caregiver ID from context
func GetCaregiverID(ctx context.Context) (uuid.UUID, bool) {
	caregiverID, ok := ctx.Value(CaregiverIDKey).(uuid.UUID)
	return caregiverID, ok
}

// GetFamilyID extracts family ID from context
func GetFamilyID(ctx context.Context) (uuid.UUID, bool) {
	familyID, ok := ctx.Value(FamilyIDKey).(uuid.UUID)
	return familyID, ok
}

// RequireAuth returns error if caregiver/family not in context
func RequireAuth(ctx context.Context) (caregiverID, familyID uuid.UUID, err error) {
	caregiverID, ok := GetCaregiverID(ctx)
	if !ok {
		return uuid.Nil, uuid.Nil, fmt.Errorf("authentication required")
	}

	familyID, ok = GetFamilyID(ctx)
	if !ok {
		return uuid.Nil, uuid.Nil, fmt.Errorf("authentication required")
	}

	return caregiverID, familyID, nil
}