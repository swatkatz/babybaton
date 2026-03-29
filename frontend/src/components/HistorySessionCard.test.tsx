import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HistorySessionCard } from './HistorySessionCard';
import { CareSessionStatus, ActivityType, FeedType } from '../types/__generated__/graphql';

jest.mock('lucide-react-native', () => ({
  ChevronRight: () => 'ChevronRight',
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
    feed: '#5B9BD5',
    diaper: '#FFB6A3',
    sleep: '#B19CD9',
    success: '#7BC96F',
    error: '#FF6B6B',
  },
  getCaregiverColor: jest.fn(() => ({ bg: '#CFE2FF', text: '#0D6EFD' })),
}));

jest.mock('react-native-gesture-handler', () => ({
  Swipeable: ({ children }: any) => children,
  TouchableOpacity: ({ children, onPress }: any) => {
    const { TouchableOpacity: RNTouchable } = require('react-native');
    return <RNTouchable onPress={onPress}>{children}</RNTouchable>;
  },
}));

jest.mock('../utils/time', () => ({
  formatTime: jest.fn((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }),
  formatDuration: jest.fn(() => '4h 0m'),
}));

const makeSession = (overrides: Partial<any> = {}) => ({
  id: 'session-1',
  status: CareSessionStatus.Completed,
  startedAt: '2025-01-15T08:00:00Z',
  completedAt: '2025-01-15T12:00:00Z',
  caregiver: { id: 'cg-1', name: 'Amit' },
  activities: [
    {
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
      },
    },
    {
      __typename: 'DiaperActivity' as const,
      id: 'diaper-1',
      activityType: ActivityType.Diaper,
      createdAt: '2025-01-15T09:30:00Z',
      diaperDetails: {
        __typename: 'DiaperDetails' as const,
        changedAt: '2025-01-15T09:30:00Z',
        hadPoop: false,
        hadPee: true,
      },
    },
  ],
  summary: {
    totalFeeds: 1,
    totalMl: 90,
    totalDiaperChanges: 1,
    totalSleepMinutes: 0,
  },
  ...overrides,
});

describe('HistorySessionCard', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders caregiver name badge', () => {
    const { getByText } = render(
      <HistorySessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText('Amit')).toBeTruthy();
  });

  it('renders time range and duration', () => {
    const { formatTime } = require('../utils/time');
    const startText = formatTime(new Date('2025-01-15T08:00:00Z'));
    const endText = formatTime(new Date('2025-01-15T12:00:00Z'));

    const { getByText } = render(
      <HistorySessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText(new RegExp(startText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
    expect(getByText(new RegExp(endText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
    expect(getByText(/4h 0m/)).toBeTruthy();
  });

  it('renders activity content (verifies activity text appears)', () => {
    const { getByText } = render(
      <HistorySessionCard session={makeSession()} onPress={onPress} />
    );
    expect(getByText(/Fed 90ml/)).toBeTruthy();
    expect(getByText(/Changed diaper/)).toBeTruthy();
  });

  it('calls onPress when card header is tapped', () => {
    const { getByTestId } = render(
      <HistorySessionCard session={makeSession()} onPress={onPress} />
    );
    fireEvent.press(getByTestId('session-header'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
