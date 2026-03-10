package model

import (
	"bytes"
	"testing"
)

func TestFeedType_MarshalGQL_Valid(t *testing.T) {
	tests := []struct {
		input    FeedType
		expected string
	}{
		{FeedTypeBreastMilk, `"BREAST_MILK"`},
		{FeedTypeFormula, `"FORMULA"`},
		{FeedTypeSolids, `"SOLIDS"`},
	}

	for _, tc := range tests {
		t.Run(string(tc.input), func(t *testing.T) {
			var buf bytes.Buffer
			tc.input.MarshalGQL(&buf)
			if buf.String() != tc.expected {
				t.Errorf("MarshalGQL() = %q, want %q", buf.String(), tc.expected)
			}
		})
	}
}

func TestFeedType_MarshalGQL_Invalid(t *testing.T) {
	invalid := FeedType("solids") // lowercase — the original bug
	var buf bytes.Buffer
	invalid.MarshalGQL(&buf)
	if buf.String() != "null" {
		t.Errorf("MarshalGQL() = %q, want \"null\" for invalid enum", buf.String())
	}
}

func TestFeedType_MarshalJSON_Invalid(t *testing.T) {
	invalid := FeedType("breast_milk") // lowercase — would have been the old mapper output
	_, err := invalid.MarshalJSON()
	if err == nil {
		t.Error("MarshalJSON() should return error for invalid enum value")
	}
}

func TestFeedType_UnmarshalGQL_Valid(t *testing.T) {
	var ft FeedType
	err := ft.UnmarshalGQL("SOLIDS")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ft != FeedTypeSolids {
		t.Errorf("got %q, want %q", ft, FeedTypeSolids)
	}
}

func TestFeedType_UnmarshalGQL_Invalid(t *testing.T) {
	var ft FeedType
	err := ft.UnmarshalGQL("solids")
	if err == nil {
		t.Error("expected error for lowercase enum value")
	}
}

func TestSolidsUnit_MarshalGQL_Valid(t *testing.T) {
	tests := []struct {
		input    SolidsUnit
		expected string
	}{
		{SolidsUnitSpoons, `"SPOONS"`},
		{SolidsUnitBowls, `"BOWLS"`},
		{SolidsUnitPieces, `"PIECES"`},
		{SolidsUnitPortions, `"PORTIONS"`},
	}

	for _, tc := range tests {
		t.Run(string(tc.input), func(t *testing.T) {
			var buf bytes.Buffer
			tc.input.MarshalGQL(&buf)
			if buf.String() != tc.expected {
				t.Errorf("MarshalGQL() = %q, want %q", buf.String(), tc.expected)
			}
		})
	}
}

func TestSolidsUnit_MarshalGQL_Invalid(t *testing.T) {
	invalid := SolidsUnit("spoons") // lowercase
	var buf bytes.Buffer
	invalid.MarshalGQL(&buf)
	if buf.String() != "null" {
		t.Errorf("MarshalGQL() = %q, want \"null\" for invalid enum", buf.String())
	}
}

func TestSolidsUnit_MarshalJSON_Invalid(t *testing.T) {
	invalid := SolidsUnit("bowls")
	_, err := invalid.MarshalJSON()
	if err == nil {
		t.Error("MarshalJSON() should return error for invalid enum value")
	}
}

func TestSolidsUnit_UnmarshalGQL_Invalid(t *testing.T) {
	var su SolidsUnit
	err := su.UnmarshalGQL("spoons")
	if err == nil {
		t.Error("expected error for lowercase enum value")
	}
}
