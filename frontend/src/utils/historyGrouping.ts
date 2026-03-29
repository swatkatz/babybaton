/**
 * Pure utility functions for grouping, filtering, and searching care sessions
 * Used by the History tab to organize sessions by day with summaries
 */

import { ActivityType, CareSessionStatus } from '../types/__generated__/graphql';
import type { GetCurrentSessionQuery } from '../types/__generated__/graphql';

// Use the same Activity type as the rest of the app
type CurrentSession = NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
type Activity = CurrentSession['activities'][number];

export interface SessionLike {
  id: string;
  status: CareSessionStatus;
  startedAt: string;
  completedAt: string | null;
  caregiver: { id: string; name: string };
  activities: ReadonlyArray<Activity>;
  summary: {
    totalFeeds: number;
    totalMl: number;
    totalDiaperChanges: number;
    totalSleepMinutes: number;
  };
}

export interface DayGroup {
  dayKey: string;
  label: string;
  sessions: SessionLike[];
}

export interface DaySummary {
  feedCount: number;
  totalMl: number;
  diaperPoop: number;
  diaperPee: number;
  totalSleepMinutes: number;
}

export type FilterType = 'ALL' | ActivityType;

export interface SearchResult {
  activity: Activity;
  caregiverName: string;
  sessionId: string;
}

export interface SearchDayGroup {
  dayKey: string;
  label: string;
  results: SearchResult[];
}

/**
 * Get a day key (YYYY-MM-DD) from an ISO date string using local timezone
 */
function getDayKey(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a day key as "Today", "Yesterday", or "Mon, Jan 15"
 */
export function formatDayLabel(dateString: string, now: Date = new Date()): string {
  const date = new Date(dateString);

  const todayKey = getDayKey(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getDayKey(yesterdayDate.toISOString());
  const dateKey = getDayKey(dateString);

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Group sessions by day, ordered most-recent-day first.
 * Sessions within a day are ordered by startedAt descending.
 */
export function groupSessionsByDay(sessions: ReadonlyArray<SessionLike>): DayGroup[] {
  if (sessions.length === 0) return [];

  const dayMap = new Map<string, SessionLike[]>();

  for (const session of sessions) {
    const key = getDayKey(session.startedAt);
    if (!dayMap.has(key)) {
      dayMap.set(key, []);
    }
    dayMap.get(key)!.push(session);
  }

  // Sort day keys descending (most recent first)
  const sortedKeys = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const daySessions = dayMap.get(key)!;
    // Sort sessions within day by startedAt descending
    daySessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    return {
      dayKey: key,
      label: formatDayLabel(daySessions[0].startedAt),
      sessions: daySessions,
    };
  });
}

/**
 * Compute summary stats for a day's sessions.
 * Aggregates from session summaries + iterates activities for poop/pee breakdown.
 */
export function computeDaySummary(sessions: ReadonlyArray<SessionLike>): DaySummary {
  let feedCount = 0;
  let totalMl = 0;
  let diaperPoop = 0;
  let diaperPee = 0;
  let totalSleepMinutes = 0;

  for (const session of sessions) {
    feedCount += session.summary.totalFeeds;
    totalMl += session.summary.totalMl;
    totalSleepMinutes += session.summary.totalSleepMinutes;

    // Iterate activities for poop/pee breakdown since summary only has totalDiaperChanges
    for (const activity of session.activities) {
      if (activity.__typename === 'DiaperActivity') {
        if (activity.diaperDetails?.hadPoop) diaperPoop++;
        if (activity.diaperDetails?.hadPee) diaperPee++;
      }
    }
  }

  return { feedCount, totalMl, diaperPoop, diaperPee, totalSleepMinutes };
}

/**
 * Filter sessions by activity type.
 * 'ALL' returns sessions unchanged.
 * Other types strip non-matching activities and drop sessions with no remaining activities.
 */
export function filterByActivityType(
  sessions: ReadonlyArray<SessionLike>,
  type: FilterType
): SessionLike[] {
  if (type === 'ALL') return [...sessions];

  const typenameMap: Record<string, string> = {
    [ActivityType.Feed]: 'FeedActivity',
    [ActivityType.Diaper]: 'DiaperActivity',
    [ActivityType.Sleep]: 'SleepActivity',
  };
  const targetTypename = typenameMap[type];

  return sessions
    .map((session) => ({
      ...session,
      activities: session.activities.filter((a) => a.__typename === targetTypename),
    }))
    .filter((session) => session.activities.length > 0);
}

/**
 * Generate searchable text from an activity for text search matching.
 */
export function getActivitySearchText(activity: Activity): string {
  const parts: string[] = [];

  switch (activity.__typename) {
    case 'FeedActivity':
      parts.push('feed');
      if (activity.feedDetails?.foodName) parts.push(activity.feedDetails.foodName);
      if (activity.feedDetails?.feedType) parts.push(activity.feedDetails.feedType);
      if (activity.feedDetails?.amountMl) parts.push(`${activity.feedDetails.amountMl}ml`);
      break;
    case 'DiaperActivity':
      parts.push('diaper');
      if (activity.diaperDetails?.hadPoop) parts.push('poop');
      if (activity.diaperDetails?.hadPee) parts.push('pee');
      break;
    case 'SleepActivity':
      parts.push('sleep');
      break;
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Search activities by text query. Returns flat results grouped by day with caregiver tags.
 * Case-insensitive matching against activity search text.
 */
export function searchActivities(
  sessions: ReadonlyArray<SessionLike>,
  query: string
): SearchDayGroup[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();
  const dayMap = new Map<string, { label: string; results: SearchResult[] }>();

  for (const session of sessions) {
    for (const activity of session.activities) {
      const searchText = getActivitySearchText(activity);
      if (searchText.includes(lowerQuery)) {
        // Determine the day key from the activity's time
        const activityTime = getActivityTime(activity);
        const key = getDayKey(activityTime);

        if (!dayMap.has(key)) {
          dayMap.set(key, {
            label: formatDayLabel(activityTime),
            results: [],
          });
        }
        dayMap.get(key)!.results.push({
          activity,
          caregiverName: session.caregiver.name,
          sessionId: session.id,
        });
      }
    }
  }

  // Sort day keys descending
  const sortedKeys = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => ({
    dayKey: key,
    ...dayMap.get(key)!,
  }));
}

/**
 * Get the primary time for an activity (for sorting/grouping).
 */
function getActivityTime(activity: Activity): string {
  switch (activity.__typename) {
    case 'FeedActivity':
      return activity.feedDetails?.startTime ?? activity.createdAt;
    case 'DiaperActivity':
      return activity.diaperDetails?.changedAt ?? activity.createdAt;
    case 'SleepActivity':
      return activity.sleepDetails?.startTime ?? activity.createdAt;
  }
}
