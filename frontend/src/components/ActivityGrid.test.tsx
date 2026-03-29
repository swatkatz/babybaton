import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityGrid } from './ActivityGrid';
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

const makeActivity = (id: string, type: 'feed' | 'diaper' | 'sleep', createdAt: string) => {
  if (type === 'feed') {
    return {
      __typename: 'FeedActivity' as const,
      id,
      activityType: ActivityType.Feed,
      createdAt,
      feedDetails: {
        __typename: 'FeedDetails' as const,
        startTime: createdAt,
        endTime: null,
        amountMl: 120,
        feedType: FeedType.Formula,
        durationMinutes: null,
        foodName: null,
        quantity: null,
        quantityUnit: null,
      },
    };
  }
  if (type === 'diaper') {
    return {
      __typename: 'DiaperActivity' as const,
      id,
      activityType: ActivityType.Diaper,
      createdAt,
      diaperDetails: {
        __typename: 'DiaperDetails' as const,
        changedAt: createdAt,
        hadPoop: true,
        hadPee: false,
      },
    };
  }
  return {
    __typename: 'SleepActivity' as const,
    id,
    activityType: ActivityType.Sleep,
    createdAt,
    sleepDetails: {
      __typename: 'SleepDetails' as const,
      startTime: createdAt,
      endTime: null,
      durationMinutes: 30,
      isActive: false,
    },
  };
};

describe('ActivityGrid', () => {
  const onActivityPress = jest.fn();
  const onSeeAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when activities is empty', () => {
    const { queryByTestId } = render(
      <ActivityGrid activities={[]} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    expect(queryByTestId('activity-grid')).toBeNull();
  });

  it('renders cells for fewer than 6 activities without See All', () => {
    const activities = [
      makeActivity('a1', 'feed', '2025-01-15T10:00:00Z'),
      makeActivity('a2', 'diaper', '2025-01-15T11:00:00Z'),
      makeActivity('a3', 'sleep', '2025-01-15T12:00:00Z'),
    ];
    const { getAllByTestId, queryByTestId } = render(
      <ActivityGrid activities={activities} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    const cells = getAllByTestId(/^activity-cell-/);
    expect(cells).toHaveLength(3);
    expect(queryByTestId('see-all-cell')).toBeNull();
  });

  it('renders 5 cells + See All when 6+ activities', () => {
    const activities = Array.from({ length: 7 }, (_, i) =>
      makeActivity(`a${i}`, 'feed', `2025-01-15T${String(10 + i).padStart(2, '0')}:00:00Z`)
    );
    const { getAllByTestId, getByTestId } = render(
      <ActivityGrid activities={activities} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    const cells = getAllByTestId(/^activity-cell-/);
    expect(cells).toHaveLength(5);
    expect(getByTestId('see-all-cell')).toBeTruthy();
  });

  it('orders cells most-recent-first', () => {
    const activities = [
      makeActivity('oldest', 'feed', '2025-01-15T10:00:00Z'),
      makeActivity('newest', 'diaper', '2025-01-15T15:00:00Z'),
      makeActivity('middle', 'sleep', '2025-01-15T12:00:00Z'),
    ];
    const { getAllByTestId } = render(
      <ActivityGrid activities={activities} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    const cells = getAllByTestId(/^activity-cell-/);
    expect(cells[0].props.testID).toBe('activity-cell-newest');
    expect(cells[1].props.testID).toBe('activity-cell-middle');
    expect(cells[2].props.testID).toBe('activity-cell-oldest');
  });

  it('calls onActivityPress with activity ID when cell tapped', () => {
    const activities = [makeActivity('a1', 'feed', '2025-01-15T10:00:00Z')];
    const { getByTestId } = render(
      <ActivityGrid activities={activities} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    fireEvent.press(getByTestId('activity-cell-a1'));
    expect(onActivityPress).toHaveBeenCalledWith('a1');
  });

  it('calls onSeeAll when See All cell tapped', () => {
    const activities = Array.from({ length: 6 }, (_, i) =>
      makeActivity(`a${i}`, 'feed', `2025-01-15T${String(10 + i).padStart(2, '0')}:00:00Z`)
    );
    const { getByTestId } = render(
      <ActivityGrid activities={activities} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    fireEvent.press(getByTestId('see-all-cell'));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('renders exactly 5 activities when there are exactly 5', () => {
    const activities = Array.from({ length: 5 }, (_, i) =>
      makeActivity(`a${i}`, 'feed', `2025-01-15T${String(10 + i).padStart(2, '0')}:00:00Z`)
    );
    const { getAllByTestId, queryByTestId } = render(
      <ActivityGrid activities={activities} onActivityPress={onActivityPress} onSeeAll={onSeeAll} />
    );
    expect(getAllByTestId(/^activity-cell-/)).toHaveLength(5);
    expect(queryByTestId('see-all-cell')).toBeNull();
  });
});
