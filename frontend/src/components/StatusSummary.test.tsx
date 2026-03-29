import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusSummary } from './StatusSummary';
import { ActivityType, FeedType } from '../types/__generated__/graphql';

// Mock colors module
jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
  },
}));

// Mock time utils
jest.mock('../utils/time', () => ({
  formatRelativeTime: jest.fn(() => '45m ago'),
  formatDuration: jest.fn(() => '1h 20m'),
  formatMinutesToDuration: jest.fn(() => '45m'),
}));

const makeFeed = (overrides?: Record<string, unknown>) => ({
  __typename: 'FeedActivity' as const,
  id: 'feed-1',
  activityType: ActivityType.Feed,
  createdAt: '2025-01-15T10:00:00Z',
  feedDetails: {
    __typename: 'FeedDetails' as const,
    startTime: '2025-01-15T10:00:00Z',
    endTime: '2025-01-15T10:30:00Z',
    amountMl: 120,
    feedType: FeedType.Formula,
    foodName: null,
    ...((overrides?.feedDetails as Record<string, unknown>) || {}),
  },
  ...overrides,
});

const makeSleep = (overrides?: Record<string, unknown>) => ({
  __typename: 'SleepActivity' as const,
  id: 'sleep-1',
  activityType: ActivityType.Sleep,
  createdAt: '2025-01-15T11:00:00Z',
  sleepDetails: {
    __typename: 'SleepDetails' as const,
    startTime: '2025-01-15T11:00:00Z',
    endTime: '2025-01-15T11:45:00Z',
    durationMinutes: 45,
    isActive: false,
    ...((overrides?.sleepDetails as Record<string, unknown>) || {}),
  },
  ...overrides,
});

const makeDiaper = (overrides?: Record<string, unknown>) => ({
  __typename: 'DiaperActivity' as const,
  id: 'diaper-1',
  activityType: ActivityType.Diaper,
  createdAt: '2025-01-15T12:00:00Z',
  diaperDetails: {
    __typename: 'DiaperDetails' as const,
    changedAt: '2025-01-15T12:00:00Z',
    hadPoop: true,
    hadPee: false,
    ...((overrides?.diaperDetails as Record<string, unknown>) || {}),
  },
  ...overrides,
});

describe('StatusSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feed row tests
  describe('feed row', () => {
    it('should show feed with relative time and amount + type', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: makeFeed(),
            lastSleep: null,
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('Last feed: 45m ago')).toBeTruthy();
      expect(getByText('120ml formula')).toBeTruthy();
    });

    it('should show breast milk feed type correctly', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: makeFeed({
              feedDetails: {
                __typename: 'FeedDetails' as const,
                startTime: '2025-01-15T10:00:00Z',
                endTime: null,
                amountMl: 100,
                feedType: FeedType.BreastMilk,
                foodName: null,
              },
            }),
            lastSleep: null,
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('100ml breast milk')).toBeTruthy();
    });

    it('should show solids with food name', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: makeFeed({
              feedDetails: {
                __typename: 'FeedDetails' as const,
                startTime: '2025-01-15T10:00:00Z',
                endTime: null,
                amountMl: null,
                feedType: FeedType.Solids,
                foodName: 'banana',
              },
            }),
            lastSleep: null,
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('banana')).toBeTruthy();
    });

    it('should show "No feeds yet" when lastFeed is null', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: null,
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('No feeds yet')).toBeTruthy();
    });
  });

  // Sleep row tests
  describe('sleep row', () => {
    it('should show sleep with relative time and duration', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: makeSleep(),
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('Last sleep: 45m ago')).toBeTruthy();
      expect(getByText('45m')).toBeTruthy();
    });

    it('should show "Sleeping now" with live duration when active', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: makeSleep({
              sleepDetails: {
                __typename: 'SleepDetails' as const,
                startTime: '2025-01-15T11:00:00Z',
                endTime: null,
                durationMinutes: null,
                isActive: true,
              },
            }),
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('Sleeping now')).toBeTruthy();
      expect(getByText('1h 20m')).toBeTruthy();
    });

    it('should show "No sleep yet" when lastSleep is null', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: null,
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('No sleep yet')).toBeTruthy();
    });
  });

  // Diaper row tests
  describe('diaper row', () => {
    it('should show poop diaper with correct icon and label', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: null,
            lastDiaper: makeDiaper(),
          }}
        />
      );
      expect(getByText('Last diaper: 45m ago')).toBeTruthy();
      expect(getByText('poop')).toBeTruthy();
      expect(getByText('💩')).toBeTruthy();
    });

    it('should show pee diaper with correct icon and label', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: null,
            lastDiaper: makeDiaper({
              diaperDetails: {
                __typename: 'DiaperDetails' as const,
                changedAt: '2025-01-15T12:00:00Z',
                hadPoop: false,
                hadPee: true,
              },
            }),
          }}
        />
      );
      expect(getByText('pee')).toBeTruthy();
      expect(getByText('💧', { exact: false })).toBeTruthy();
    });

    it('should show both poop+pee diaper', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: null,
            lastDiaper: makeDiaper({
              diaperDetails: {
                __typename: 'DiaperDetails' as const,
                changedAt: '2025-01-15T12:00:00Z',
                hadPoop: true,
                hadPee: true,
              },
            }),
          }}
        />
      );
      expect(getByText('poop + pee')).toBeTruthy();
      expect(getByText('💩💧')).toBeTruthy();
    });

    it('should show "No diapers yet" when lastDiaper is null', () => {
      const { getByText } = render(
        <StatusSummary
          status={{
            __typename: 'BabyStatus',
            lastFeed: null,
            lastSleep: null,
            lastDiaper: null,
          }}
        />
      );
      expect(getByText('No diapers yet')).toBeTruthy();
    });
  });

  // General tests
  it('should render all three empty states when all null', () => {
    const { getByText } = render(
      <StatusSummary
        status={{
          __typename: 'BabyStatus',
          lastFeed: null,
          lastSleep: null,
          lastDiaper: null,
        }}
      />
    );
    expect(getByText('No feeds yet')).toBeTruthy();
    expect(getByText('No sleep yet')).toBeTruthy();
    expect(getByText('No diapers yet')).toBeTruthy();
  });
});
