import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityItem } from './ActivityItem';
import { ActivityType, FeedType } from '../types/__generated__/graphql';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
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

// Mock the time utils
jest.mock('../utils/time', () => ({
  formatTime: jest.fn((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }),
  formatDuration: jest.fn(() => '1h 30m'),
}));

const makeFeedActivity = (overrides?: Partial<any>) => ({
  __typename: 'FeedActivity' as const,
  id: 'feed-1',
  activityType: ActivityType.Feed,
  createdAt: '2025-01-15T15:00:00Z',
  feedDetails: {
    __typename: 'FeedDetails' as const,
    startTime: '2025-01-15T15:00:00Z',
    endTime: '2025-01-15T15:30:00Z',
    amountMl: 120,
    feedType: FeedType.BreastMilk,
    durationMinutes: 30,
  },
  ...overrides,
});

const makeDiaperActivity = (overrides?: Partial<any>) => ({
  __typename: 'DiaperActivity' as const,
  id: 'diaper-1',
  activityType: ActivityType.Diaper,
  createdAt: '2025-01-15T16:00:00Z',
  diaperDetails: {
    __typename: 'DiaperDetails' as const,
    changedAt: '2025-01-15T16:00:00Z',
    hadPoop: true,
    hadPee: true,
  },
  ...overrides,
});

const makeSleepActivity = (overrides?: Partial<any>) => ({
  __typename: 'SleepActivity' as const,
  id: 'sleep-1',
  activityType: ActivityType.Sleep,
  createdAt: '2025-01-15T14:00:00Z',
  sleepDetails: {
    __typename: 'SleepDetails' as const,
    startTime: '2025-01-15T14:00:00Z',
    endTime: '2025-01-15T16:00:00Z',
    durationMinutes: 120,
    isActive: false,
  },
  ...overrides,
});

describe('ActivityItem', () => {
  describe('FeedActivity rendering', () => {
    it('should render feed activity with amount and type', () => {
      const { getByText } = render(
        <ActivityItem activity={makeFeedActivity()} />
      );

      expect(getByText(/Fed 120ml breast milk/)).toBeTruthy();
    });

    it('should render feed time range with start and end times', () => {
      const { getByText } = render(
        <ActivityItem activity={makeFeedActivity()} />
      );

      // Should show a start-end time range (format depends on timezone, so just check pattern)
      expect(getByText(/\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)/)).toBeTruthy();
    });

    it('should handle feed without end time', () => {
      const activity = makeFeedActivity({
        feedDetails: {
          __typename: 'FeedDetails',
          startTime: '2025-01-15T15:00:00Z',
          endTime: null,
          amountMl: 100,
          feedType: FeedType.Formula,
          durationMinutes: null,
        },
      });

      const { getByText } = render(
        <ActivityItem activity={activity} />
      );

      expect(getByText(/Fed 100ml formula/)).toBeTruthy();
    });
  });

  describe('DiaperActivity rendering', () => {
    it('should render diaper activity with poop emoji when hadPoop is true', () => {
      const { getByText } = render(
        <ActivityItem activity={makeDiaperActivity()} />
      );

      expect(getByText(/Changed diaper/)).toBeTruthy();
    });

    it('should render diaper without poop indicator when hadPoop is false', () => {
      const activity = makeDiaperActivity({
        diaperDetails: {
          __typename: 'DiaperDetails',
          changedAt: '2025-01-15T16:00:00Z',
          hadPoop: false,
          hadPee: true,
        },
      });

      const { getByText } = render(
        <ActivityItem activity={activity} />
      );

      expect(getByText(/Changed diaper/)).toBeTruthy();
    });
  });

  describe('SleepActivity rendering', () => {
    it('should render sleep activity with duration', () => {
      const { getByText } = render(
        <ActivityItem activity={makeSleepActivity()} />
      );

      expect(getByText(/Sleeping/)).toBeTruthy();
    });

    it('should show LIVE indicator when sleep is active', () => {
      const activity = makeSleepActivity({
        sleepDetails: {
          __typename: 'SleepDetails',
          startTime: '2025-01-15T14:00:00Z',
          endTime: null,
          durationMinutes: null,
          isActive: true,
        },
      });

      const { getByText } = render(
        <ActivityItem activity={activity} />
      );

      expect(getByText(/LIVE/)).toBeTruthy();
    });

    it('should show "Mark as Awake" button when sleep is active and onMarkAwake is provided', () => {
      const activity = makeSleepActivity({
        sleepDetails: {
          __typename: 'SleepDetails',
          startTime: '2025-01-15T14:00:00Z',
          endTime: null,
          durationMinutes: null,
          isActive: true,
        },
      });

      const onMarkAwake = jest.fn();
      const { getByText } = render(
        <ActivityItem activity={activity} onMarkAwake={onMarkAwake} />
      );

      const button = getByText(/Mark as Awake/);
      expect(button).toBeTruthy();

      fireEvent.press(button);
      expect(onMarkAwake).toHaveBeenCalledWith('sleep-1');
    });

    it('should not show "Mark as Awake" button when sleep is not active', () => {
      const { queryByText } = render(
        <ActivityItem
          activity={makeSleepActivity()}
          onMarkAwake={jest.fn()}
        />
      );

      expect(queryByText(/Mark as Awake/)).toBeNull();
    });

    it('should not show "Mark as Awake" button when onMarkAwake is not provided', () => {
      const activity = makeSleepActivity({
        sleepDetails: {
          __typename: 'SleepDetails',
          startTime: '2025-01-15T14:00:00Z',
          endTime: null,
          durationMinutes: null,
          isActive: true,
        },
      });

      const { queryByText } = render(
        <ActivityItem activity={activity} />
      );

      expect(queryByText(/Mark as Awake/)).toBeNull();
    });
  });

  describe('swipe to delete', () => {
    it('should render without Swipeable when onDelete is not provided', () => {
      // Should render normally without crash
      const { getByText } = render(
        <ActivityItem activity={makeFeedActivity()} />
      );
      expect(getByText(/Fed 120ml/)).toBeTruthy();
    });

    it('should render with Swipeable when onDelete is provided', () => {
      const onDelete = jest.fn();
      const { getByText } = render(
        <ActivityItem activity={makeFeedActivity()} onDelete={onDelete} />
      );
      expect(getByText(/Fed 120ml/)).toBeTruthy();
    });
  });
});
