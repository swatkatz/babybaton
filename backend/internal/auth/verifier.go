package auth

import "context"

// AuthVerifier verifies authentication tokens and extracts user identity.
// Implementations are provider-specific (Supabase, Firebase, etc.)
// but the interface is provider-agnostic.
type AuthVerifier interface {
	// VerifyToken validates a JWT token string and returns the user's
	// external provider ID and email. Returns an error if the token
	// is invalid, expired, or malformed.
	VerifyToken(ctx context.Context, token string) (userID string, email string, err error)
}
