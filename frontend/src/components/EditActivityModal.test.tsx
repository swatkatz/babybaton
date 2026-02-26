import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditActivityModal } from './EditActivityModal';
import { ActivityType, FeedType } from '../types/__generated__/graphql';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

// Mock datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const MockDateTimePicker = (props: { value?: Date }) => (
    <View testID="datetime-picker">
      <Text>{props.value?.toISOString?.() ?? ''}</Text>
    </View>
  );
  return { __esModule: true, default: MockDateTimePicker };
});

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  saving: false,
};

const makeFeedActivity = () => ({
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
});

const makeDiaperActivity = () => ({
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
});

const makeSleepActivity = () => ({
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
});

describe('EditActivityModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('feed activity', () => {
    it('should show Edit Feed title and pre-populated amount', () => {
      const { getByText, getByDisplayValue } = render(
        <EditActivityModal {...baseProps} activity={makeFeedActivity()} />,
      );

      expect(getByText('Edit Feed')).toBeTruthy();
      expect(getByDisplayValue('120')).toBeTruthy();
    });

    it('should call onSave with updated feed details', () => {
      const { getByDisplayValue, getByText } = render(
        <EditActivityModal {...baseProps} activity={makeFeedActivity()} />,
      );

      // Change amount
      const amountInput = getByDisplayValue('120');
      fireEvent.changeText(amountInput, '200');

      // Press save
      fireEvent.press(getByText('Save Changes'));

      expect(baseProps.onSave).toHaveBeenCalledTimes(1);
      expect(baseProps.onSave).toHaveBeenCalledWith(
        'feed-1',
        expect.objectContaining({
          activityType: ActivityType.Feed,
          feedDetails: expect.objectContaining({
            amountMl: 200,
          }),
        }),
      );
    });

    it('should show validation error for empty amount', () => {
      const { getByDisplayValue, getByText } = render(
        <EditActivityModal {...baseProps} activity={makeFeedActivity()} />,
      );

      // Clear amount
      fireEvent.changeText(getByDisplayValue('120'), '');

      // Press save
      fireEvent.press(getByText('Save Changes'));

      expect(getByText('Please enter a valid amount in ml')).toBeTruthy();
      expect(baseProps.onSave).not.toHaveBeenCalled();
    });

    it('should allow changing feed type', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeFeedActivity()} />,
      );

      // Activity pre-populated with BreastMilk, switch to Formula
      fireEvent.press(getByText('Formula'));
      fireEvent.press(getByText('Save Changes'));

      expect(baseProps.onSave).toHaveBeenCalledWith(
        'feed-1',
        expect.objectContaining({
          feedDetails: expect.objectContaining({
            feedType: FeedType.Formula,
          }),
        }),
      );
    });
  });

  describe('diaper activity', () => {
    it('should show Edit Diaper Change title', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeDiaperActivity()} />,
      );

      expect(getByText('Edit Diaper Change')).toBeTruthy();
    });

    it('should call onSave with updated diaper details', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeDiaperActivity()} />,
      );

      // Toggle poop off (it's currently on)
      fireEvent.press(getByText('Poop'));

      fireEvent.press(getByText('Save Changes'));

      expect(baseProps.onSave).toHaveBeenCalledWith(
        'diaper-1',
        expect.objectContaining({
          activityType: ActivityType.Diaper,
          diaperDetails: expect.objectContaining({
            hadPoop: false,
            hadPee: true,
          }),
        }),
      );
    });

    it('should show validation error when both pee and poop are off', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeDiaperActivity()} />,
      );

      // Toggle both off
      fireEvent.press(getByText('Poop'));
      fireEvent.press(getByText('Pee'));

      fireEvent.press(getByText('Save Changes'));

      expect(getByText('Please select at least pee or poop')).toBeTruthy();
      expect(baseProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('sleep activity', () => {
    it('should show Edit Sleep title', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeSleepActivity()} />,
      );

      expect(getByText('Edit Sleep')).toBeTruthy();
    });

    it('should call onSave with updated sleep details', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeSleepActivity()} />,
      );

      fireEvent.press(getByText('Save Changes'));

      expect(baseProps.onSave).toHaveBeenCalledWith(
        'sleep-1',
        expect.objectContaining({
          activityType: ActivityType.Sleep,
          sleepDetails: expect.objectContaining({
            startTime: expect.any(String),
          }),
        }),
      );
    });

    it('should show Set End Time toggle pre-checked when endTime exists', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeSleepActivity()} />,
      );

      // Set End Time toggle should exist
      expect(getByText('Set End Time')).toBeTruthy();
      // End Time label should be visible since activity has end time
      expect(getByText('End Time')).toBeTruthy();
    });

    it('should not show End Time when sleep is active (no end time)', () => {
      const activity = {
        ...makeSleepActivity(),
        sleepDetails: {
          __typename: 'SleepDetails' as const,
          startTime: '2025-01-15T14:00:00Z',
          endTime: null,
          durationMinutes: null,
          isActive: true,
        },
      };

      const { getByText, queryByText } = render(
        <EditActivityModal {...baseProps} activity={activity} />,
      );

      expect(getByText('Set End Time')).toBeTruthy();
      expect(queryByText('End Time')).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByText } = render(
        <EditActivityModal {...baseProps} activity={makeFeedActivity()} />,
      );

      fireEvent.press(getByText('\u2715'));

      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
      expect(baseProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('saving state', () => {
    it('should disable save button when saving', () => {
      const { getByText } = render(
        <EditActivityModal
          {...baseProps}
          activity={makeFeedActivity()}
          saving={true}
        />,
      );

      // Save button should show activity indicator, not text
      expect(() => getByText('Save Changes')).toThrow();
    });
  });
});
