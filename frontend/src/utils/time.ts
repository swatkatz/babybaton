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
export const formatMinutesToDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  }
  return `${mins}m`;
};
