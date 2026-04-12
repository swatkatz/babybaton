package parallel

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestRun_AllFunctionsComplete(t *testing.T) {
	var count atomic.Int32

	err := Run(context.Background(),
		func(ctx context.Context) error {
			count.Add(1)
			return nil
		},
		func(ctx context.Context) error {
			count.Add(1)
			return nil
		},
		func(ctx context.Context) error {
			count.Add(1)
			return nil
		},
	)

	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if got := count.Load(); got != 3 {
		t.Fatalf("expected 3 functions to run, got %d", got)
	}
}

func TestRun_FirstErrorWins(t *testing.T) {
	errExpected := errors.New("first failure")

	// The failing function returns immediately; the other blocks until cancelled.
	err := Run(context.Background(),
		func(ctx context.Context) error {
			return errExpected
		},
		func(ctx context.Context) error {
			<-ctx.Done()
			return ctx.Err()
		},
	)

	if !errors.Is(err, errExpected) {
		t.Fatalf("expected %v, got %v", errExpected, err)
	}
}

func TestRun_ContextCancellationPropagates(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	var cancelled atomic.Bool

	go func() {
		time.Sleep(10 * time.Millisecond)
		cancel()
	}()

	err := Run(ctx,
		func(ctx context.Context) error {
			<-ctx.Done()
			cancelled.Store(true)
			return ctx.Err()
		},
	)

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
	if !cancelled.Load() {
		t.Fatal("function did not observe cancellation")
	}
}

func TestRun_EmptyFunctionList(t *testing.T) {
	err := Run(context.Background())
	if err != nil {
		t.Fatalf("expected nil error for empty function list, got %v", err)
	}
}
