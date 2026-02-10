import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CurrentSessionCard } from './CurrentSessionCard';
import {
  CareSessionStatus,
  ActivityType,
  FeedType,
} from '../types/__generated__/graphql';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  ChevronRight: () => 'ChevronRight',
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    Swipeable: ({ children }: any) => children,
    GestureHandlerRootView: View,
  };
});

// Mock colors module
jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    feed: '#5B9BD5',
    diaper: '#FFB6A3',
    sleep: '#B19CD9',
    error: '#FF6B6B',
  },
  getCaregiverColor: jest.fn(() => ({ bg: '#CFE2FF', text: '#0D6EFD' })),
}));

// Mock time utils
jest.mock('../utils/time', () => ({
  formatTime: jest.fn(() => '10:00 AM'),
  formatDuration: jest.fn(() => '2h 15m'),
}));

const makeSession = (activityOverrides?: any[]) => ({
  __typename: 'CareSession' as const,
  id: 'session-1',
  status: CareSessionStatus.InProgress,
  startedAt: '2025-01-15T10:00:00Z',
  completedAt: null,
  notes: null,
  caregiver: {
    __typename: 'Caregiver' as const,
    id: 'cg-1',
    name: 'Jane',
    deviceId: 'device-1',
    deviceName: 'iPhone 15',
  },
  activities: activityOverrides || [
    {
      __typename: 'FeedActivity' as const,
      id: 'feed-1',
      activityType: ActivityType.Feed,
      createdAt: '2025-01-15T10:30:00Z',
      feedDetails: {
        __typename: 'FeedDetails' as const,
        startTime: '2025-01-15T10:30:00Z',
        endTime: '2025-01-15T11:00:00Z',
        amountMl: 120,
        feedType: FeedType.BreastMilk,
        durationMinutes: 30,
      },
    },
    {
      __typename: 'DiaperActivity' as const,
      id: 'diaper-1',
      activityType: ActivityType.Diaper,
      createdAt: '2025-01-15T11:30:00Z',
      diaperDetails: {
        __typename: 'DiaperDetails' as const,
        changedAt: '2025-01-15T11:30:00Z',
        hadPoop: false,
        hadPee: true,
      },
    },
  ],
  summary: {
    __typename: 'CareSessionSummary' as const,
    totalFeeds: 1,
    totalMl: 120,
    totalDiaperChanges: 1,
    totalSleepMinutes: 0,
    lastFeedTime: '2025-01-15T10:30:00Z',
    lastSleepTime: null,
    currentlyAsleep: false,
  },
});

describe('CurrentSessionCard', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the session title', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText(/Current Care Session/)).toBeTruthy();
  });

  it('should display the caregiver name', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText('Jane')).toBeTruthy();
  });

  it('should display session info with start time and duration', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession()} onPress={onPress} />
    );
    // Uses mocked formatTime (returns '10:00 AM') and formatDuration (returns '2h 15m')
    expect(getByText(/Started: 10:00 AM/)).toBeTruthy();
    expect(getByText(/Duration: 2h 15m/)).toBeTruthy();
  });

  it('should display activity count in footer', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText('2 activities total')).toBeTruthy();
  });

  it('should use singular "activity" when there is only one', () => {
    const singleActivity = [
      {
        __typename: 'FeedActivity' as const,
        id: 'feed-1',
        activityType: ActivityType.Feed,
        createdAt: '2025-01-15T10:30:00Z',
        feedDetails: {
          __typename: 'FeedDetails' as const,
          startTime: '2025-01-15T10:30:00Z',
          endTime: null,
          amountMl: 100,
          feedType: null,
          durationMinutes: null,
        },
      },
    ];

    const { getByText } = render(
      <CurrentSessionCard
        session={makeSession(singleActivity)}
        onPress={onPress}
      />
    );
    expect(getByText('1 activity total')).toBeTruthy();
  });

  it('should call onPress when card is tapped', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession()} onPress={onPress} />
    );
    fireEvent.press(getByText('Jane'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should render each activity item', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession()} onPress={onPress} />
    );
    // Feed activity text
    expect(getByText(/Fed 120ml/)).toBeTruthy();
    // Diaper activity text
    expect(getByText(/Changed diaper/)).toBeTruthy();
  });

  it('should handle sessions with no activities', () => {
    const { getByText } = render(
      <CurrentSessionCard session={makeSession([])} onPress={onPress} />
    );
    expect(getByText('0 activities total')).toBeTruthy();
  });
});
