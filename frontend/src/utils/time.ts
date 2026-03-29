/**
 * Time formatting utilities
 * Shared across all components for consistent time display
 */

/**
 * Format a Date object as "2:30 PM"
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Calculate duration between two dates and format as "2h 45m"
 */
export const formatDuration = (
  startDate: Date,
  endDate: Date = new Date()
): string => {
  const minutes = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  );
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Format minutes as "2h 45m" or "45m"
 */
/**
 * Format a date as relative time: "just now", "5m ago", "2h ago", "3d ago"
 */
export const formatRelativeTime = (
  date: Date,
  now: Date = new Date()
): string => {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'just now';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const formatMinutesToDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  }
  return `${mins}m`;
};
