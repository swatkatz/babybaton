import {
  formatTime,
  formatDuration,
  formatRelativeTime,
  formatMinutesToDuration,
  formatShortTime,
} from './time';

describe('formatTime', () => {
  it('should format a morning time correctly', () => {
    // Use a fixed date: Jan 15, 2025, 9:30 AM
    const date = new Date(2025, 0, 15, 9, 30, 0);
    const result = formatTime(date);
    expect(result).toMatch(/9:30\s*AM/i);
  });

  it('should format an afternoon time correctly', () => {
    const date = new Date(2025, 0, 15, 14, 45, 0);
    const result = formatTime(date);
    expect(result).toMatch(/2:45\s*PM/i);
  });

  it('should format midnight correctly', () => {
    const date = new Date(2025, 0, 15, 0, 0, 0);
    const result = formatTime(date);
    expect(result).toMatch(/12:00\s*AM/i);
  });

  it('should format noon correctly', () => {
    const date = new Date(2025, 0, 15, 12, 0, 0);
    const result = formatTime(date);
    expect(result).toMatch(/12:00\s*PM/i);
  });

  it('should pad single-digit minutes with a zero', () => {
    const date = new Date(2025, 0, 15, 3, 5, 0);
    const result = formatTime(date);
    expect(result).toMatch(/3:05\s*AM/i);
  });
});

describe('formatDuration', () => {
  it('should format a duration of less than an hour as minutes only', () => {
    const start = new Date(2025, 0, 15, 10, 0, 0);
    const end = new Date(2025, 0, 15, 10, 45, 0);
    expect(formatDuration(start, end)).toBe('45m');
  });

  it('should format a duration of exactly one hour', () => {
    const start = new Date(2025, 0, 15, 10, 0, 0);
    const end = new Date(2025, 0, 15, 11, 0, 0);
    expect(formatDuration(start, end)).toBe('1h 0m');
  });

  it('should format a multi-hour duration with minutes', () => {
    const start = new Date(2025, 0, 15, 10, 0, 0);
    const end = new Date(2025, 0, 15, 12, 30, 0);
    expect(formatDuration(start, end)).toBe('2h 30m');
  });

  it('should return 0m for identical start and end', () => {
    const date = new Date(2025, 0, 15, 10, 0, 0);
    expect(formatDuration(date, date)).toBe('0m');
  });

  it('should use current time as default end date', () => {
    // Create a start date 30 minutes ago
    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const result = formatDuration(thirtyMinAgo);
    // Should be approximately 30m (allow for a minute of test execution)
    expect(result).toMatch(/^(29|30|31)m$/);
  });

  it('should handle overnight durations', () => {
    const start = new Date(2025, 0, 15, 22, 0, 0);
    const end = new Date(2025, 0, 16, 6, 30, 0);
    expect(formatDuration(start, end)).toBe('8h 30m');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date(2025, 0, 15, 12, 0, 0);

  it('should return "just now" for less than 1 minute ago', () => {
    const date = new Date(now.getTime() - 30_000); // 30 seconds ago
    expect(formatRelativeTime(date, now)).toBe('just now');
  });

  it('should return "1m ago" for 1 minute ago', () => {
    const date = new Date(now.getTime() - 60_000);
    expect(formatRelativeTime(date, now)).toBe('1m ago');
  });

  it('should return "5m ago" for 5 minutes ago', () => {
    const date = new Date(now.getTime() - 5 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('5m ago');
  });

  it('should return "59m ago" for 59 minutes ago', () => {
    const date = new Date(now.getTime() - 59 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('59m ago');
  });

  it('should return "1h ago" for 1 hour ago', () => {
    const date = new Date(now.getTime() - 60 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('1h ago');
  });

  it('should return "2h ago" for 2 hours ago', () => {
    const date = new Date(now.getTime() - 2 * 60 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('2h ago');
  });

  it('should return "23h ago" for 23 hours ago', () => {
    const date = new Date(now.getTime() - 23 * 60 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('23h ago');
  });

  it('should return "1d ago" for 24 hours ago', () => {
    const date = new Date(now.getTime() - 24 * 60 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('1d ago');
  });

  it('should return "2d ago" for 48 hours ago', () => {
    const date = new Date(now.getTime() - 48 * 60 * 60_000);
    expect(formatRelativeTime(date, now)).toBe('2d ago');
  });

  it('should return "just now" for future dates', () => {
    const date = new Date(now.getTime() + 60_000);
    expect(formatRelativeTime(date, now)).toBe('just now');
  });
});

describe('formatShortTime', () => {
  it('should format afternoon time as "3:15p"', () => {
    const date = new Date(2025, 0, 15, 15, 15, 0);
    expect(formatShortTime(date)).toBe('3:15p');
  });

  it('should format midnight as "12:00a"', () => {
    const date = new Date(2025, 0, 15, 0, 0, 0);
    expect(formatShortTime(date)).toBe('12:00a');
  });

  it('should format noon as "12:00p"', () => {
    const date = new Date(2025, 0, 15, 12, 0, 0);
    expect(formatShortTime(date)).toBe('12:00p');
  });

  it('should format morning time as "9:05a"', () => {
    const date = new Date(2025, 0, 15, 9, 5, 0);
    expect(formatShortTime(date)).toBe('9:05a');
  });

  it('should format 11:59 PM as "11:59p"', () => {
    const date = new Date(2025, 0, 15, 23, 59, 0);
    expect(formatShortTime(date)).toBe('11:59p');
  });
});

describe('formatMinutesToDuration', () => {
  it('should format minutes less than 60 as Xm', () => {
    expect(formatMinutesToDuration(45)).toBe('45m');
  });

  it('should format 0 minutes as 0m', () => {
    expect(formatMinutesToDuration(0)).toBe('0m');
  });

  it('should format exactly 60 minutes as 1h', () => {
    expect(formatMinutesToDuration(60)).toBe('1h');
  });

  it('should format 90 minutes as 1h 30m', () => {
    expect(formatMinutesToDuration(90)).toBe('1h 30m');
  });

  it('should format 120 minutes as 2h', () => {
    expect(formatMinutesToDuration(120)).toBe('2h');
  });

  it('should format 165 minutes as 2h 45m', () => {
    expect(formatMinutesToDuration(165)).toBe('2h 45m');
  });

  it('should handle large values', () => {
    expect(formatMinutesToDuration(600)).toBe('10h');
  });
});
