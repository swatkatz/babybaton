package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/auth"
	"github.com/swatkatz/babybaton/backend/internal/domain"
	"github.com/swatkatz/babybaton/backend/internal/store"
)

type contextKey string

const (
	CaregiverIDKey   contextKey = "caregiverId"
	FamilyIDKey      contextKey = "familyId"
	TimezoneKey      contextKey = "timezone"
	UserIDKey        contextKey = "userId"
	UserKey          contextKey = "user"
	SupabaseIDKey    contextKey = "supabaseId"
	SupabaseEmailKey contextKey = "supabaseEmail"
)

// AuthMiddleware extracts caregiver and family IDs from headers (legacy device-based auth).
// Use NewDualAuthMiddleware for combined JWT + header auth support.
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

		// Extract timezone
		timezone := r.Header.Get("X-Timezone")
		if timezone == "" {
			timezone = "UTC" // Default fallback
		}
		ctx = context.WithValue(ctx, TimezoneKey, timezone)

		// Pass modified context to next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// DualAuthMiddleware supports both JWT Bearer token auth and legacy header-based auth.
type DualAuthMiddleware struct {
	verifier auth.AuthVerifier
	store    store.Store
}

// NewDualAuthMiddleware creates middleware that checks auth in order:
// 1. Authorization: Bearer <jwt> → verify via AuthVerifier, resolve user → caregiver + family
// 2. X-Family-ID + X-Caregiver-ID headers → existing device-based path
// 3. Neither → unauthenticated (passes through with no auth context)
func NewDualAuthMiddleware(verifier auth.AuthVerifier, store store.Store) *DualAuthMiddleware {
	return &DualAuthMiddleware{
		verifier: verifier,
		store:    store,
	}
}

// Handler returns the HTTP middleware handler.
func (m *DualAuthMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		token := extractBearerToken(r)
		if token != "" {
			// JWT auth path
			ctx = m.handleJWTAuth(ctx, w, r, token)
			if ctx == nil {
				// handleJWTAuth already wrote the error response
				return
			}
		} else {
			// Legacy header-based auth path
			ctx = handleHeaderAuth(ctx, r)
		}

		// Always extract timezone
		timezone := r.Header.Get("X-Timezone")
		if timezone == "" {
			timezone = "UTC"
		}
		ctx = context.WithValue(ctx, TimezoneKey, timezone)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// handleJWTAuth verifies the JWT, looks up (or auto-creates) the user, and resolves
// the family context. If X-Family-Id header is provided, uses that; otherwise
// auto-selects if the user belongs to exactly one family. Returns nil context if
// verification fails (and writes the HTTP error response).
func (m *DualAuthMiddleware) handleJWTAuth(ctx context.Context, w http.ResponseWriter, r *http.Request, token string) context.Context {
	supabaseID, email, err := m.verifier.VerifyToken(ctx, token)
	if err != nil {
		log.Printf("JWT verification failed: %v", err)
		http.Error(w, "invalid or expired token", http.StatusUnauthorized)
		return nil
	}

	// Always set verified Supabase identity in context
	ctx = context.WithValue(ctx, SupabaseIDKey, supabaseID)
	ctx = context.WithValue(ctx, SupabaseEmailKey, email)

	// Look up existing user — auto-create if not found
	user, err := m.store.GetUserBySupabaseID(ctx, supabaseID)
	if err != nil {
		// Auto-create user record for verified JWT users
		newUser := &domain.User{
			ID:             uuid.New(),
			SupabaseUserID: supabaseID,
			Email:          email,
		}
		if createErr := m.store.CreateUser(ctx, newUser); createErr == nil {
			user = newUser
			log.Printf("Auto-created user record for Supabase ID %s", supabaseID)
		} else {
			log.Printf("Failed to auto-create user for Supabase ID %s: %v", supabaseID, createErr)
		}
	}

	if user != nil {
		ctx = context.WithValue(ctx, UserIDKey, user.ID)
		ctx = context.WithValue(ctx, UserKey, user)
	}

	// Resolve family context for the user
	if user != nil {
		familyIDStr := r.Header.Get("X-Family-Id")
		if familyIDStr != "" {
			// Explicit family selection via header
			familyID, err := uuid.Parse(familyIDStr)
			if err == nil {
				caregiver, err := m.store.GetCaregiverByUserAndFamily(ctx, user.ID, familyID)
				if err == nil {
					ctx = context.WithValue(ctx, CaregiverIDKey, caregiver.ID)
					ctx = context.WithValue(ctx, FamilyIDKey, familyID)
				}
			}
		} else {
			// Auto-resolve: if user belongs to exactly one family, select it automatically
			families, err := m.store.GetFamiliesByUserID(ctx, user.ID)
			if err == nil && len(families) == 1 {
				caregiver, err := m.store.GetCaregiverByUserAndFamily(ctx, user.ID, families[0].ID)
				if err == nil {
					ctx = context.WithValue(ctx, CaregiverIDKey, caregiver.ID)
					ctx = context.WithValue(ctx, FamilyIDKey, families[0].ID)
				}
			}
		}
	}

	return ctx
}

// handleHeaderAuth extracts caregiver and family IDs from legacy headers.
func handleHeaderAuth(ctx context.Context, r *http.Request) context.Context {
	caregiverIDStr := r.Header.Get("X-Caregiver-Id")
	if caregiverIDStr != "" {
		caregiverID, err := uuid.Parse(caregiverIDStr)
		if err == nil {
			ctx = context.WithValue(ctx, CaregiverIDKey, caregiverID)
		}
	}

	familyIDStr := r.Header.Get("X-Family-Id")
	if familyIDStr != "" {
		familyID, err := uuid.Parse(familyIDStr)
		if err == nil {
			ctx = context.WithValue(ctx, FamilyIDKey, familyID)
		}
	}

	return ctx
}

// extractBearerToken extracts the token from an "Authorization: Bearer <token>" header.
func extractBearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
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

// GetTimezone extracts timezone from context
func GetTimezone(ctx context.Context) string {
	if tz, ok := ctx.Value(TimezoneKey).(string); ok {
		return tz
	}
	return "UTC" // Default fallback
}

// GetUserID extracts user ID from context (set by JWT auth path)
func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}

// GetUser extracts user from context (set by JWT auth path)
func GetUser(ctx context.Context) (*domain.User, bool) {
	user, ok := ctx.Value(UserKey).(*domain.User)
	return user, ok
}

// GetSupabaseID extracts the verified Supabase user ID from context
func GetSupabaseID(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(SupabaseIDKey).(string)
	return id, ok
}

// GetSupabaseEmail extracts the verified Supabase email from context
func GetSupabaseEmail(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(SupabaseEmailKey).(string)
	return email, ok
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
