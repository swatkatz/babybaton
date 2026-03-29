import {
  groupSessionsByDay,
  computeDaySummary,
  formatDayLabel,
  filterByActivityType,
  searchActivities,
  getActivitySearchText,
  SessionLike,
} from './historyGrouping';
import { ActivityType, CareSessionStatus, FeedType } from '../types/__generated__/graphql';

// Helper to create test sessions
const makeSession = (overrides: Partial<SessionLike> = {}): SessionLike => ({
  id: 'session-1',
  status: CareSessionStatus.Completed,
  startedAt: '2025-01-15T10:00:00Z',
  completedAt: '2025-01-15T12:00:00Z',
  caregiver: { id: 'cg-1', name: 'Swati' },
  activities: [],
  summary: {
    totalFeeds: 2,
    totalMl: 200,
    totalDiaperChanges: 1,
    totalSleepMinutes: 30,
  },
  ...overrides,
});

const makeFeedActivity = (overrides: Partial<any> = {}) => ({
  __typename: 'FeedActivity' as const,
  id: 'feed-1',
  activityType: ActivityType.Feed,
  createdAt: '2025-01-15T11:00:00Z',
  feedDetails: {
    __typename: 'FeedDetails' as const,
    startTime: '2025-01-15T11:00:00Z',
    endTime: '2025-01-15T11:30:00Z',
    amountMl: 90,
    feedType: FeedType.Formula,
    durationMinutes: 30,
    foodName: null,
    quantity: null,
    quantityUnit: null,
    ...overrides.feedDetails,
  },
  ...overrides,
  // Ensure feedDetails is not overridden by spread
});

const makeDiaperActivity = (overrides: Partial<any> = {}) => ({
  __typename: 'DiaperActivity' as const,
  id: 'diaper-1',
  activityType: ActivityType.Diaper,
  createdAt: '2025-01-15T09:30:00Z',
  diaperDetails: {
    __typename: 'DiaperDetails' as const,
    changedAt: '2025-01-15T09:30:00Z',
    hadPoop: true,
    hadPee: false,
    ...overrides.diaperDetails,
  },
  ...overrides,
});

const makeSleepActivity = (overrides: Partial<any> = {}) => ({
  __typename: 'SleepActivity' as const,
  id: 'sleep-1',
  activityType: ActivityType.Sleep,
  createdAt: '2025-01-15T08:00:00Z',
  sleepDetails: {
    __typename: 'SleepDetails' as const,
    startTime: '2025-01-15T08:00:00Z',
    endTime: '2025-01-15T08:45:00Z',
    durationMinutes: 45,
    isActive: false,
    ...overrides.sleepDetails,
  },
  ...overrides,
});

describe('groupSessionsByDay', () => {
  it('groups sessions from 3 different days into 3 groups, ordered most-recent-day first', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: '2025-01-13T10:00:00Z' }),
      makeSession({ id: 's2', startedAt: '2025-01-15T10:00:00Z' }),
      makeSession({ id: 's3', startedAt: '2025-01-14T10:00:00Z' }),
    ];

    const groups = groupSessionsByDay(sessions);
    expect(groups).toHaveLength(3);
    // Most recent first
    expect(groups[0].sessions[0].id).toBe('s2'); // Jan 15
    expect(groups[1].sessions[0].id).toBe('s3'); // Jan 14
    expect(groups[2].sessions[0].id).toBe('s1'); // Jan 13
  });

  it('orders sessions within a day by startedAt descending', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: '2025-01-15T08:00:00Z' }),
      makeSession({ id: 's2', startedAt: '2025-01-15T14:00:00Z' }),
      makeSession({ id: 's3', startedAt: '2025-01-15T10:00:00Z' }),
    ];

    const groups = groupSessionsByDay(sessions);
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions.map((s) => s.id)).toEqual(['s2', 's3', 's1']);
  });

  it('returns empty array for empty input', () => {
    expect(groupSessionsByDay([])).toEqual([]);
  });
});

describe('computeDaySummary', () => {
  it('aggregates feed count, total ml, total sleep minutes from session summaries', () => {
    const sessions = [
      makeSession({
        summary: { totalFeeds: 2, totalMl: 200, totalDiaperChanges: 1, totalSleepMinutes: 30 },
        activities: [],
      }),
      makeSession({
        summary: { totalFeeds: 1, totalMl: 90, totalDiaperChanges: 2, totalSleepMinutes: 45 },
        activities: [],
      }),
    ];

    const summary = computeDaySummary(sessions);
    expect(summary.feedCount).toBe(3);
    expect(summary.totalMl).toBe(290);
    expect(summary.totalSleepMinutes).toBe(75);
  });

  it('counts poop/pee diapers by iterating activities', () => {
    const sessions = [
      makeSession({
        activities: [
          makeDiaperActivity({ id: 'd1', diaperDetails: { __typename: 'DiaperDetails', changedAt: '2025-01-15T09:00:00Z', hadPoop: true, hadPee: true } }),
          makeDiaperActivity({ id: 'd2', diaperDetails: { __typename: 'DiaperDetails', changedAt: '2025-01-15T10:00:00Z', hadPoop: false, hadPee: true } }),
        ],
      }),
    ];

    const summary = computeDaySummary(sessions);
    expect(summary.diaperPoop).toBe(1);
    expect(summary.diaperPee).toBe(2);
  });
});

describe('formatDayLabel', () => {
  const now = new Date('2025-01-15T12:00:00Z');

  it('returns "Today" for today\'s date', () => {
    expect(formatDayLabel('2025-01-15T10:00:00Z', now)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    expect(formatDayLabel('2025-01-14T10:00:00Z', now)).toBe('Yesterday');
  });

  it('returns formatted date for older dates', () => {
    const label = formatDayLabel('2025-01-13T10:00:00Z', now);
    // Should be "Mon, Jan 13" (Jan 13, 2025 is a Monday)
    expect(label).toMatch(/Mon, Jan 13/);
  });
});

describe('filterByActivityType', () => {
  it('returns sessions unchanged when filter is ALL', () => {
    const sessions = [
      makeSession({ activities: [makeFeedActivity(), makeDiaperActivity()] }),
    ];
    const result = filterByActivityType(sessions, 'ALL');
    expect(result).toHaveLength(1);
    expect(result[0].activities).toHaveLength(2);
  });

  it('filters to only feed activities, dropping empty sessions', () => {
    const sessions = [
      makeSession({
        id: 's1',
        activities: [makeFeedActivity(), makeDiaperActivity()],
      }),
      makeSession({
        id: 's2',
        activities: [makeDiaperActivity()], // No feeds — should be dropped
      }),
    ];

    const result = filterByActivityType(sessions, ActivityType.Feed);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
    expect(result[0].activities).toHaveLength(1);
    expect(result[0].activities[0].__typename).toBe('FeedActivity');
  });
});

describe('searchActivities', () => {
  it('matches "poop" against DiaperActivity with hadPoop, case-insensitive', () => {
    const sessions = [
      makeSession({
        caregiver: { id: 'cg-1', name: 'Swati' },
        activities: [
          makeDiaperActivity({ diaperDetails: { __typename: 'DiaperDetails', changedAt: '2025-01-15T09:30:00Z', hadPoop: true, hadPee: false } }),
          makeFeedActivity(),
        ],
      }),
    ];

    const results = searchActivities(sessions, 'POOP');
    expect(results).toHaveLength(1);
    expect(results[0].results).toHaveLength(1);
    expect(results[0].results[0].caregiverName).toBe('Swati');
    expect(results[0].results[0].activity.__typename).toBe('DiaperActivity');
  });

  it('returns empty for empty query', () => {
    const sessions = [makeSession({ activities: [makeFeedActivity()] })];
    expect(searchActivities(sessions, '')).toEqual([]);
    expect(searchActivities(sessions, '   ')).toEqual([]);
  });
});

describe('getActivitySearchText', () => {
  it('generates "feed" text for feed activity', () => {
    const text = getActivitySearchText(makeFeedActivity());
    expect(text).toContain('feed');
    expect(text).toContain('90ml');
  });

  it('generates "diaper poop" for poop diaper activity', () => {
    const text = getActivitySearchText(
      makeDiaperActivity({ diaperDetails: { __typename: 'DiaperDetails', changedAt: '2025-01-15T09:30:00Z', hadPoop: true, hadPee: false } })
    );
    expect(text).toContain('diaper');
    expect(text).toContain('poop');
    expect(text).not.toContain('pee');
  });

  it('generates "sleep" for sleep activity', () => {
    const text = getActivitySearchText(makeSleepActivity());
    expect(text).toContain('sleep');
  });
});
