package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"

	"github.com/golang-jwt/jwt/v5"
)

// SupabaseVerifier implements AuthVerifier using Supabase's JWKS endpoint
// to verify ES256-signed JWTs.
type SupabaseVerifier struct {
	jwksURL string
	keys    map[string]*ecdsa.PublicKey
	keysMu  sync.RWMutex
}

// NewSupabaseVerifier creates a verifier that validates ES256 JWTs using
// the public keys from Supabase's JWKS endpoint.
func NewSupabaseVerifier(supabaseURL string) *SupabaseVerifier {
	return &SupabaseVerifier{
		jwksURL: supabaseURL + "/auth/v1/.well-known/jwks.json",
		keys:    make(map[string]*ecdsa.PublicKey),
	}
}

func (v *SupabaseVerifier) VerifyToken(ctx context.Context, tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != jwt.SigningMethodES256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("token missing kid header")
		}
		key, err := v.getECKey(kid)
		if err != nil {
			return nil, err
		}
		return key, nil
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

func (v *SupabaseVerifier) getECKey(kid string) (*ecdsa.PublicKey, error) {
	v.keysMu.RLock()
	key, ok := v.keys[kid]
	v.keysMu.RUnlock()
	if ok {
		return key, nil
	}

	if err := v.fetchJWKS(); err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	v.keysMu.RLock()
	key, ok = v.keys[kid]
	v.keysMu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	KTY string `json:"kty"`
	KID string `json:"kid"`
	CRV string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func (v *SupabaseVerifier) fetchJWKS() error {
	resp, err := http.Get(v.jwksURL)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	v.keysMu.Lock()
	defer v.keysMu.Unlock()
	for _, k := range jwks.Keys {
		if k.KTY != "EC" || k.CRV != "P-256" {
			continue
		}
		xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
		if err != nil {
			continue
		}
		yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
		if err != nil {
			continue
		}
		v.keys[k.KID] = &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}
	}
	return nil
}
