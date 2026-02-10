import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecentSessionCard } from './RecentSessionCard';
import { CareSessionStatus, ActivityType } from '../types/__generated__/graphql';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  ChevronRight: () => 'ChevronRight',
}));

// Mock colors module
jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
  },
  getCaregiverColor: jest.fn(() => ({ bg: '#CFE2FF', text: '#0D6EFD' })),
}));

// Mock time utils
jest.mock('../utils/time', () => ({
  formatTime: jest.fn((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }),
  formatDuration: jest.fn(() => '2h 30m'),
  formatMinutesToDuration: jest.fn((min: number) => {
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return `${mins}m`;
  }),
}));

const makeSession = (overrides?: Partial<any>) => ({
  __typename: 'CareSession' as const,
  id: 'session-1',
  status: CareSessionStatus.Completed,
  startedAt: '2025-01-15T10:00:00Z',
  completedAt: '2025-01-15T12:30:00Z',
  caregiver: {
    __typename: 'Caregiver' as const,
    id: 'cg-1',
    name: 'Jane',
  },
  activities: [],
  summary: {
    __typename: 'CareSessionSummary' as const,
    totalFeeds: 3,
    totalMl: 360,
    totalDiaperChanges: 2,
    totalSleepMinutes: 90,
    lastFeedTime: '2025-01-15T12:00:00Z',
    lastSleepTime: '2025-01-15T11:30:00Z',
    currentlyAsleep: false,
  },
  ...overrides,
});

describe('RecentSessionCard', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the caregiver name', () => {
    const { getByText } = render(
      <RecentSessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText('Jane')).toBeTruthy();
  });

  it('should display feed summary correctly', () => {
    const { getByText } = render(
      <RecentSessionCard session={makeSession()} onPress={onPress} />
    );
    // "3 feeds" (plural)
    expect(getByText(/3 feeds/)).toBeTruthy();
    expect(getByText(/360ml/)).toBeTruthy();
  });

  it('should use singular "feed" for 1 feed', () => {
    const session = makeSession({
      summary: {
        __typename: 'CareSessionSummary',
        totalFeeds: 1,
        totalMl: 120,
        totalDiaperChanges: 0,
        totalSleepMinutes: 0,
        lastFeedTime: null,
        lastSleepTime: null,
        currentlyAsleep: false,
      },
    });

    const { getByText } = render(
      <RecentSessionCard session={session} onPress={onPress} />
    );
    expect(getByText(/1 feed /)).toBeTruthy();
  });

  it('should display sleep time when totalSleepMinutes > 0', () => {
    const { getByText } = render(
      <RecentSessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText(/1h 30m sleep/)).toBeTruthy();
  });

  it('should not display sleep info when totalSleepMinutes is 0', () => {
    const session = makeSession({
      summary: {
        __typename: 'CareSessionSummary',
        totalFeeds: 2,
        totalMl: 240,
        totalDiaperChanges: 1,
        totalSleepMinutes: 0,
        lastFeedTime: null,
        lastSleepTime: null,
        currentlyAsleep: false,
      },
    });

    const { queryByText } = render(
      <RecentSessionCard session={session} onPress={onPress} />
    );
    expect(queryByText(/sleep/)).toBeNull();
  });

  it('should call onPress when tapped', () => {
    const { getByText } = render(
      <RecentSessionCard session={makeSession()} onPress={onPress} />
    );

    fireEvent.press(getByText('Jane'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should display duration when completedAt is present', () => {
    const { getByText } = render(
      <RecentSessionCard session={makeSession()} onPress={onPress} />
    );
    // The mocked formatDuration returns '2h 30m'
    expect(getByText(/2h 30m/)).toBeTruthy();
  });
});
