package model

import (
	"fmt"
	"io"
	"strconv"
)

// FeedType is a manually-defined GraphQL enum so we can validate on marshal (output).
// gqlgen only validates on unmarshal (input) by default, which means invalid values
// constructed server-side (e.g., wrong casing from domain model conversion) silently
// pass through to clients.
type FeedType string

const (
	FeedTypeBreastMilk FeedType = "BREAST_MILK"
	FeedTypeFormula    FeedType = "FORMULA"
	FeedTypeSolids     FeedType = "SOLIDS"
)

var AllFeedType = []FeedType{
	FeedTypeBreastMilk,
	FeedTypeFormula,
	FeedTypeSolids,
}

func (e FeedType) IsValid() bool {
	switch e {
	case FeedTypeBreastMilk, FeedTypeFormula, FeedTypeSolids:
		return true
	}
	return false
}

func (e FeedType) String() string {
	return string(e)
}

func (e *FeedType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = FeedType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid FeedType", str)
	}
	return nil
}

func (e FeedType) MarshalGQL(w io.Writer) {
	if !e.IsValid() {
		// Write null and let the GraphQL error handling surface the issue,
		// rather than silently sending an invalid enum value to clients.
		fmt.Fprint(w, "null")
		return
	}
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *FeedType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	*e = FeedType(s)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid FeedType", s)
	}
	return nil
}

func (e FeedType) MarshalJSON() ([]byte, error) {
	if !e.IsValid() {
		return nil, fmt.Errorf("%s is not a valid FeedType", string(e))
	}
	return []byte(strconv.Quote(e.String())), nil
}

// SolidsUnit is a manually-defined GraphQL enum with output validation.
type SolidsUnit string

const (
	SolidsUnitSpoons   SolidsUnit = "SPOONS"
	SolidsUnitBowls    SolidsUnit = "BOWLS"
	SolidsUnitPieces   SolidsUnit = "PIECES"
	SolidsUnitPortions SolidsUnit = "PORTIONS"
)

var AllSolidsUnit = []SolidsUnit{
	SolidsUnitSpoons,
	SolidsUnitBowls,
	SolidsUnitPieces,
	SolidsUnitPortions,
}

func (e SolidsUnit) IsValid() bool {
	switch e {
	case SolidsUnitSpoons, SolidsUnitBowls, SolidsUnitPieces, SolidsUnitPortions:
		return true
	}
	return false
}

func (e SolidsUnit) String() string {
	return string(e)
}

func (e *SolidsUnit) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = SolidsUnit(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SolidsUnit", str)
	}
	return nil
}

func (e SolidsUnit) MarshalGQL(w io.Writer) {
	if !e.IsValid() {
		fmt.Fprint(w, "null")
		return
	}
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *SolidsUnit) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	*e = SolidsUnit(s)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SolidsUnit", s)
	}
	return nil
}

func (e SolidsUnit) MarshalJSON() ([]byte, error) {
	if !e.IsValid() {
		return nil, fmt.Errorf("%s is not a valid SolidsUnit", string(e))
	}
	return []byte(strconv.Quote(e.String())), nil
}
