package parallel

import (
	"context"

	"golang.org/x/sync/errgroup"
)

// Run executes functions concurrently, returning on first error.
// Remaining functions are cancelled via context on failure.
func Run(ctx context.Context, fns ...func(ctx context.Context) error) error {
	g, ctx := errgroup.WithContext(ctx)
	for _, fn := range fns {
		g.Go(func() error { return fn(ctx) })
	}
	return g.Wait()
}
