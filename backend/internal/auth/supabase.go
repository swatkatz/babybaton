package auth

import (
	"context"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// SupabaseVerifier implements AuthVerifier using Supabase's HS256 JWT secret.
type SupabaseVerifier struct {
	jwtSecret []byte
}

// NewSupabaseVerifier creates a verifier that validates JWTs signed with the
// given Supabase JWT secret (HS256).
func NewSupabaseVerifier(jwtSecret string) *SupabaseVerifier {
	return &SupabaseVerifier{
		jwtSecret: []byte(jwtSecret),
	}
}

func (v *SupabaseVerifier) VerifyToken(ctx context.Context, tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return v.jwtSecret, nil
	})
	if err != nil {
		return "", "", fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", "", fmt.Errorf("invalid token claims")
	}

	sub, err := claims.GetSubject()
	if err != nil || sub == "" {
		return "", "", fmt.Errorf("missing sub claim")
	}

	email, _ := claims["email"].(string)
	if email == "" {
		return "", "", fmt.Errorf("missing email claim")
	}

	return sub, email, nil
}
