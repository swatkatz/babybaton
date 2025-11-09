package graph

import "github.com/swatkatz/babybaton/backend/internal/store"

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct{
	store store.Store
}

// NewResolver creates a new resolver with the given store
func NewResolver(store store.Store) *Resolver {
	return &Resolver{
		store: store,
	}
}
