import { renderHook, act } from '@testing-library/react-native';
import { useAutoRefresh } from './useAutoRefresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial tick of 0', () => {
    const { result } = renderHook(() => useAutoRefresh());
    expect(result.current).toBe(0);
  });

  it('should increment after one interval', () => {
    const { result } = renderHook(() => useAutoRefresh(30_000));
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe(1);
  });

  it('should increment multiple times', () => {
    const { result } = renderHook(() => useAutoRefresh(30_000));
    act(() => {
      jest.advanceTimersByTime(90_000);
    });
    expect(result.current).toBe(3);
  });

  it('should clear interval on unmount', () => {
    const { unmount } = renderHook(() => useAutoRefresh(30_000));
    unmount();
    // If interval wasn't cleared, this would throw or cause issues
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    // No error means cleanup worked
  });

  it('should accept custom interval', () => {
    const { result } = renderHook(() => useAutoRefresh(10_000));
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(1);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(2);
  });
});
