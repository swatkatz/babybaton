import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityCell, SeeAllCell } from './ActivityCell';
import { ActivityType, FeedType } from '../types/__generated__/graphql';

jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    success: '#7BC96F',
    feed: '#5B9BD5',
    diaper: '#FFB6A3',
    sleep: '#B19CD9',
  },
}));

jest.mock('../utils/time', () => ({
  formatShortTime: jest.fn(() => '3:15p'),
  formatDuration: jest.fn(() => '32m'),
  formatMinutesToDuration: jest.fn((m: number) => `${m}m`),
}));

const makeFeedActivity = (overrides?: Record<string, unknown>) => ({
  __typename: 'FeedActivity' as const,
  id: 'feed-1',
  activityType: ActivityType.Feed,
  createdAt: '2025-01-15T15:15:00Z',
  feedDetails: {
    __typename: 'FeedDetails' as const,
    startTime: '2025-01-15T15:15:00Z',
    endTime: null,
    amountMl: 120,
    feedType: FeedType.Formula,
    durationMinutes: null,
    foodName: null,
    quantity: null,
    quantityUnit: null,
  },
  ...overrides,
});

const makeDiaperActivity = (hadPoop: boolean, hadPee: boolean) => ({
  __typename: 'DiaperActivity' as const,
  id: 'diaper-1',
  activityType: ActivityType.Diaper,
  createdAt: '2025-01-15T14:45:00Z',
  diaperDetails: {
    __typename: 'DiaperDetails' as const,
    changedAt: '2025-01-15T14:45:00Z',
    hadPoop,
    hadPee,
  },
});

const makeSleepActivity = (isActive: boolean, overrides?: Record<string, unknown>) => ({
  __typename: 'SleepActivity' as const,
  id: 'sleep-1',
  activityType: ActivityType.Sleep,
  createdAt: '2025-01-15T14:30:00Z',
  sleepDetails: {
    __typename: 'SleepDetails' as const,
    startTime: '2025-01-15T14:30:00Z',
    endTime: isActive ? null : '2025-01-15T15:00:00Z',
    durationMinutes: isActive ? null : 30,
    isActive,
  },
  ...overrides,
});

describe('ActivityCell', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feed cells', () => {
    it('renders bottle feed with 🍼 icon and amount', () => {
      const { getByText } = render(
        <ActivityCell activity={makeFeedActivity()} onPress={onPress} />
      );
      expect(getByText('🍼')).toBeTruthy();
      expect(getByText('120ml')).toBeTruthy();
      expect(getByText('3:15p')).toBeTruthy();
    });

    it('renders breast feed with 🤱 icon', () => {
      const activity = makeFeedActivity({
        feedDetails: {
          __typename: 'FeedDetails' as const,
          startTime: '2025-01-15T15:15:00Z',
          endTime: null,
          amountMl: 90,
          feedType: FeedType.BreastMilk,
          durationMinutes: null,
          foodName: null,
          quantity: null,
          quantityUnit: null,
        },
      });
      const { getByText } = render(
        <ActivityCell activity={activity} onPress={onPress} />
      );
      expect(getByText('🤱')).toBeTruthy();
    });

    it('renders solids feed with 🥣 icon and food name', () => {
      const activity = makeFeedActivity({
        feedDetails: {
          __typename: 'FeedDetails' as const,
          startTime: '2025-01-15T15:15:00Z',
          endTime: null,
          amountMl: null,
          feedType: FeedType.Solids,
          durationMinutes: null,
          foodName: 'banana',
          quantity: 2,
          quantityUnit: null,
        },
      });
      const { getByText } = render(
        <ActivityCell activity={activity} onPress={onPress} />
      );
      expect(getByText('🥣')).toBeTruthy();
      expect(getByText('banana')).toBeTruthy();
    });
  });

  describe('Diaper cells', () => {
    it('renders poop cell with 💩 icon and "poop" detail', () => {
      const { getByText } = render(
        <ActivityCell activity={makeDiaperActivity(true, false)} onPress={onPress} />
      );
      expect(getByText('💩')).toBeTruthy();
      expect(getByText('poop')).toBeTruthy();
    });

    it('renders pee cell with 💧 icon and "pee" detail', () => {
      const { getByText } = render(
        <ActivityCell activity={makeDiaperActivity(false, true)} onPress={onPress} />
      );
      expect(getByText('💧')).toBeTruthy();
      expect(getByText('pee')).toBeTruthy();
    });

    it('renders both cell with 💩💧 icon and "both" detail', () => {
      const { getByText } = render(
        <ActivityCell activity={makeDiaperActivity(true, true)} onPress={onPress} />
      );
      expect(getByText('💩💧')).toBeTruthy();
      expect(getByText('both')).toBeTruthy();
    });
  });

  describe('Sleep cells', () => {
    it('renders completed sleep with 😴 icon and duration', () => {
      const { getByText } = render(
        <ActivityCell activity={makeSleepActivity(false)} onPress={onPress} />
      );
      expect(getByText('😴')).toBeTruthy();
      expect(getByText('30m')).toBeTruthy();
    });

    it('renders active sleep with green border', () => {
      const { getByTestId } = render(
        <ActivityCell activity={makeSleepActivity(true)} onPress={onPress} />
      );
      const cell = getByTestId('activity-cell-sleep-1');
      const cellStyle = cell.props.style;
      // Check that the active sleep style is applied (borderColor: success)
      const flatStyles = Array.isArray(cellStyle) ? cellStyle : [cellStyle];
      const hasGreenBorder = flatStyles.some(
        (s: Record<string, unknown>) => s && s.borderColor === '#7BC96F'
      );
      expect(hasGreenBorder).toBe(true);
    });

    it('renders active sleep with pulsing 💤', () => {
      const { getByText } = render(
        <ActivityCell activity={makeSleepActivity(true)} onPress={onPress} />
      );
      expect(getByText('💤')).toBeTruthy();
    });
  });

  it('calls onPress with activity ID when tapped', () => {
    const { getByTestId } = render(
      <ActivityCell activity={makeFeedActivity()} onPress={onPress} />
    );
    fireEvent.press(getByTestId('activity-cell-feed-1'));
    expect(onPress).toHaveBeenCalledWith('feed-1');
  });
});

describe('SeeAllCell', () => {
  it('renders "See All" text and arrow', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SeeAllCell onPress={onPress} />);
    expect(getByText('See All')).toBeTruthy();
    expect(getByText('→')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SeeAllCell onPress={onPress} />);
    fireEvent.press(getByTestId('see-all-cell'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
