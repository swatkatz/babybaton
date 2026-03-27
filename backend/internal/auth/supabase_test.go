package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func generateTestECKey() (*ecdsa.PrivateKey, error) {
	return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
}

func serveJWKS(key *ecdsa.PrivateKey, kid string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jwks := jwksResponse{
			Keys: []jwkKey{
				{
					KTY: "EC",
					KID: kid,
					CRV: "P-256",
					X:   base64.RawURLEncoding.EncodeToString(key.PublicKey.X.Bytes()),
					Y:   base64.RawURLEncoding.EncodeToString(key.PublicKey.Y.Bytes()),
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(jwks)
	}))
}

func generateES256JWT(key *ecdsa.PrivateKey, kid, sub, email string, expiry time.Time) string {
	claims := jwt.MapClaims{
		"sub":   sub,
		"email": email,
		"exp":   expiry.Unix(),
		"iat":   time.Now().Unix(),
		"aud":   "authenticated",
		"role":  "authenticated",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = kid
	signed, _ := token.SignedString(key)
	return signed
}

func TestSupabaseVerifier_ValidES256Token(t *testing.T) {
	key, err := generateTestECKey()
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	kid := "test-key-id"
	srv := serveJWKS(key, kid)
	defer srv.Close()

	// The verifier expects the base URL; it appends /auth/v1/.well-known/jwks.json
	// So we need to set up the JWKS URL directly for testing
	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	token := generateES256JWT(key, kid, "user-123", "test@example.com", time.Now().Add(time.Hour))
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
	key, _ := generateTestECKey()
	kid := "test-key-id"
	srv := serveJWKS(key, kid)
	defer srv.Close()

	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	token := generateES256JWT(key, kid, "user-123", "test@example.com", time.Now().Add(-time.Hour))
	_, _, err := v.VerifyToken(context.Background(), token)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestSupabaseVerifier_WrongKey(t *testing.T) {
	signingKey, _ := generateTestECKey()
	differentKey, _ := generateTestECKey()
	kid := "test-key-id"
	// Serve the different key, not the signing key
	srv := serveJWKS(differentKey, kid)
	defer srv.Close()

	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	token := generateES256JWT(signingKey, kid, "user-123", "test@example.com", time.Now().Add(time.Hour))
	_, _, err := v.VerifyToken(context.Background(), token)
	if err == nil {
		t.Fatal("expected error for wrong signing key")
	}
}

func TestSupabaseVerifier_MalformedToken(t *testing.T) {
	v := &SupabaseVerifier{
		jwksURL: "http://localhost:0",
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	_, _, err := v.VerifyToken(context.Background(), "not-a-jwt")
	if err == nil {
		t.Fatal("expected error for malformed token")
	}
}

func TestSupabaseVerifier_MissingSub(t *testing.T) {
	key, _ := generateTestECKey()
	kid := "test-key-id"
	srv := serveJWKS(key, kid)
	defer srv.Close()

	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	claims := jwt.MapClaims{
		"email": "test@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = kid
	signed, _ := token.SignedString(key)

	_, _, err := v.VerifyToken(context.Background(), signed)
	if err == nil {
		t.Fatal("expected error for missing sub")
	}
}

func TestSupabaseVerifier_MissingEmail(t *testing.T) {
	key, _ := generateTestECKey()
	kid := "test-key-id"
	srv := serveJWKS(key, kid)
	defer srv.Close()

	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	claims := jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = kid
	signed, _ := token.SignedString(key)

	_, _, err := v.VerifyToken(context.Background(), signed)
	if err == nil {
		t.Fatal("expected error for missing email")
	}
}

func TestSupabaseVerifier_WrongSigningMethod(t *testing.T) {
	v := &SupabaseVerifier{
		jwksURL: "http://localhost:0",
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	claims := jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte("some-secret-key-at-least-32-chars!!"))

	_, _, err := v.VerifyToken(context.Background(), signed)
	if err == nil {
		t.Fatal("expected error for wrong signing method")
	}
}

func TestSupabaseVerifier_UnknownKid(t *testing.T) {
	key, _ := generateTestECKey()
	srv := serveJWKS(key, "known-kid")
	defer srv.Close()

	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	token := generateES256JWT(key, "unknown-kid", "user-123", "test@example.com", time.Now().Add(time.Hour))
	_, _, err := v.VerifyToken(context.Background(), token)
	if err == nil {
		t.Fatal("expected error for unknown kid")
	}
}

func TestSupabaseVerifier_CachesKeys(t *testing.T) {
	key, _ := generateTestECKey()
	kid := "test-key-id"
	fetchCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fetchCount++
		jwks := jwksResponse{
			Keys: []jwkKey{
				{
					KTY: "EC",
					KID: kid,
					CRV: "P-256",
					X:   base64.RawURLEncoding.EncodeToString(key.PublicKey.X.Bytes()),
					Y:   base64.RawURLEncoding.EncodeToString(key.PublicKey.Y.Bytes()),
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(jwks)
	}))
	defer srv.Close()

	v := &SupabaseVerifier{
		jwksURL: srv.URL,
		keys:    make(map[string]*ecdsa.PublicKey),
	}

	// Verify two tokens — JWKS should only be fetched once
	for i := 0; i < 2; i++ {
		token := generateES256JWT(key, kid, "user-123", "test@example.com", time.Now().Add(time.Hour))
		_, _, err := v.VerifyToken(context.Background(), token)
		if err != nil {
			t.Fatalf("unexpected error on attempt %d: %v", i+1, err)
		}
	}
	if fetchCount != 1 {
		t.Errorf("expected 1 JWKS fetch, got %d", fetchCount)
	}
}

