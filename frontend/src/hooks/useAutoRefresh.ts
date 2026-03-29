import { useState, useEffect } from 'react';

/**
 * Hook that forces a re-render at a regular interval.
 * Useful for keeping relative timestamps fresh.
 */
export function useAutoRefresh(intervalMs: number = 30_000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
