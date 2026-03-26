package auth

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-key-at-least-32-chars-long!"

func generateTestJWT(sub, email, secret string, expiry time.Time) string {
	claims := jwt.MapClaims{
		"sub":   sub,
		"email": email,
		"exp":   expiry.Unix(),
		"iat":   time.Now().Unix(),
		"aud":   "authenticated",
		"role":  "authenticated",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(secret))
	return signed
}

func TestSupabaseVerifier_ValidToken(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)
	token := generateTestJWT("user-123", "test@example.com", testSecret, time.Now().Add(time.Hour))

	userID, email, err := v.VerifyToken(context.Background(), token)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if userID != "user-123" {
		t.Errorf("expected userID 'user-123', got '%s'", userID)
	}
	if email != "test@example.com" {
		t.Errorf("expected email 'test@example.com', got '%s'", email)
	}
}

func TestSupabaseVerifier_ExpiredToken(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)
	token := generateTestJWT("user-123", "test@example.com", testSecret, time.Now().Add(-time.Hour))

	_, _, err := v.VerifyToken(context.Background(), token)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestSupabaseVerifier_WrongSecret(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)
	token := generateTestJWT("user-123", "test@example.com", "wrong-secret-key-also-32-chars!!", time.Now().Add(time.Hour))

	_, _, err := v.VerifyToken(context.Background(), token)
	if err == nil {
		t.Fatal("expected error for wrong signing key")
	}
}

func TestSupabaseVerifier_MalformedToken(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)

	_, _, err := v.VerifyToken(context.Background(), "not-a-jwt")
	if err == nil {
		t.Fatal("expected error for malformed token")
	}
}

func TestSupabaseVerifier_MissingSub(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)
	claims := jwt.MapClaims{
		"email": "test@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(testSecret))

	_, _, err := v.VerifyToken(context.Background(), signed)
	if err == nil {
		t.Fatal("expected error for missing sub")
	}
}

func TestSupabaseVerifier_MissingEmail(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)
	claims := jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(testSecret))

	_, _, err := v.VerifyToken(context.Background(), signed)
	if err == nil {
		t.Fatal("expected error for missing email")
	}
}

func TestSupabaseVerifier_WrongSigningMethod(t *testing.T) {
	v := NewSupabaseVerifier(testSecret)
	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS384, claims)
	signed, _ := token.SignedString([]byte(testSecret))

	_, _, err := v.VerifyToken(context.Background(), signed)
	if err == nil {
		t.Fatal("expected error for wrong signing method")
	}
}
