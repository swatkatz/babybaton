package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestEncodeCursor_RoundTrip(t *testing.T) {
	originalTime := time.Date(2026, 3, 15, 10, 30, 0, 123456789, time.UTC)
	originalID := uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")

	cursor := EncodeCursor(originalTime, originalID)
	if cursor == "" {
		t.Fatal("expected non-empty cursor")
	}

	decodedTime, decodedID, err := DecodeCursor(cursor)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !decodedTime.Equal(originalTime) {
		t.Errorf("time mismatch: got %v, want %v", decodedTime, originalTime)
	}
	if decodedID != originalID {
		t.Errorf("UUID mismatch: got %v, want %v", decodedID, originalID)
	}
}

func TestEncodeCursor_NormalizesToUTC(t *testing.T) {
	loc := time.FixedZone("EST", -5*60*60)
	localTime := time.Date(2026, 3, 15, 10, 0, 0, 0, loc)
	id := uuid.New()

	cursor := EncodeCursor(localTime, id)
	decodedTime, _, err := DecodeCursor(cursor)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !decodedTime.Equal(localTime) {
		t.Errorf("times should be equal: got %v, want %v", decodedTime, localTime)
	}
	if decodedTime.Location() != time.UTC {
		t.Errorf("expected UTC location, got %v", decodedTime.Location())
	}
}

func TestDecodeCursor_Invalid(t *testing.T) {
	tests := []struct {
		name   string
		cursor string
	}{
		{"empty string", ""},
		{"not base64", "!!!not-base64!!!"},
		{"missing separator", "bm9zZXBhcmF0b3I="},                                         // "noseparator"
		{"bad timestamp", "YmFkdGltZTpjMjEwOGViMC1jOGQ4LTRiN2UtOTAxYS0wZmQyYzJjMjNhYTQ="}, // "badtime:c2108eb0-..."
		{"bad UUID", "MjAyNi0wMy0xNVQxMDozMDowMFo6bm90LWEtdXVpZA=="},                       // "2026-03-15T10:30:00Z:not-a-uuid"
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := DecodeCursor(tt.cursor)
			if err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}
