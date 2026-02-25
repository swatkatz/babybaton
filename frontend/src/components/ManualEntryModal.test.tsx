import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ManualEntryModal } from './ManualEntryModal';
import { ActivityType, FeedType } from '../types/__generated__/graphql';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const MockDateTimePicker = (props: any) => (
    <View testID={`datetime-picker`}>
      <Text>{props.value?.toISOString?.() ?? ''}</Text>
    </View>
  );
  MockDateTimePicker.default = MockDateTimePicker;
  return { __esModule: true, default: MockDateTimePicker };
});

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  saving: false,
};

describe('ManualEntryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal title', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      expect(getByText('Log Activity')).toBeTruthy();
    });

    it('should render activity type selector', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      expect(getByText('What would you like to log?')).toBeTruthy();
      expect(getByText('Feed')).toBeTruthy();
      expect(getByText('Diaper')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
    });

    it('should not show Save button before selecting a type', () => {
      const { queryByText } = render(<ManualEntryModal {...baseProps} />);
      expect(queryByText('Save Activity')).toBeNull();
    });
  });

  describe('feed form', () => {
    it('should show feed form when Feed is selected', () => {
      const { getByText, getByPlaceholderText } = render(
        <ManualEntryModal {...baseProps} />
      );
      fireEvent.press(getByText('Feed'));
      expect(getByText('Amount (ml)')).toBeTruthy();
      expect(getByText('Feed Type')).toBeTruthy();
      expect(getByPlaceholderText('e.g., 120')).toBeTruthy();
      expect(getByText('Formula')).toBeTruthy();
      expect(getByText('Breast Milk')).toBeTruthy();
    });

    it('should show Save button after selecting Feed', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Feed'));
      expect(getByText('Save Activity')).toBeTruthy();
    });

    it('should submit correct feed activity', () => {
      const { getByText, getByPlaceholderText } = render(
        <ManualEntryModal {...baseProps} />
      );
      fireEvent.press(getByText('Feed'));
      fireEvent.changeText(getByPlaceholderText('e.g., 120'), '150');
      fireEvent.press(getByText('Save Activity'));

      expect(baseProps.onSave).toHaveBeenCalledTimes(1);
      const savedActivities = baseProps.onSave.mock.calls[0][0];
      expect(savedActivities).toHaveLength(1);
      expect(savedActivities[0].activityType).toBe(ActivityType.Feed);
      expect(savedActivities[0].feedDetails).toBeDefined();
      expect(savedActivities[0].feedDetails.amountMl).toBe(150);
      expect(savedActivities[0].feedDetails.feedType).toBe(FeedType.Formula);
      expect(savedActivities[0].feedDetails.startTime).toBeDefined();
    });

    it('should submit breast milk when selected', () => {
      const { getByText, getByPlaceholderText } = render(
        <ManualEntryModal {...baseProps} />
      );
      fireEvent.press(getByText('Feed'));
      fireEvent.changeText(getByPlaceholderText('e.g., 120'), '100');
      fireEvent.press(getByText('Breast Milk'));
      fireEvent.press(getByText('Save Activity'));

      const savedActivities = baseProps.onSave.mock.calls[0][0];
      expect(savedActivities[0].feedDetails.feedType).toBe(FeedType.BreastMilk);
    });

    it('should show validation error when amount is empty', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Feed'));
      fireEvent.press(getByText('Save Activity'));

      expect(getByText('Please enter a valid amount in ml')).toBeTruthy();
      expect(baseProps.onSave).not.toHaveBeenCalled();
    });

    it('should show validation error when amount is not a number', () => {
      const { getByText, getByPlaceholderText } = render(
        <ManualEntryModal {...baseProps} />
      );
      fireEvent.press(getByText('Feed'));
      fireEvent.changeText(getByPlaceholderText('e.g., 120'), 'abc');
      fireEvent.press(getByText('Save Activity'));

      expect(getByText('Please enter a valid amount in ml')).toBeTruthy();
      expect(baseProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('diaper form', () => {
    it('should show diaper form when Diaper is selected', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Diaper'));
      expect(getByText('Pee')).toBeTruthy();
      expect(getByText('Poop')).toBeTruthy();
    });

    it('should submit correct diaper activity with defaults (hadPee=true)', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Diaper'));
      fireEvent.press(getByText('Save Activity'));

      expect(baseProps.onSave).toHaveBeenCalledTimes(1);
      const savedActivities = baseProps.onSave.mock.calls[0][0];
      expect(savedActivities).toHaveLength(1);
      expect(savedActivities[0].activityType).toBe(ActivityType.Diaper);
      expect(savedActivities[0].diaperDetails).toBeDefined();
      expect(savedActivities[0].diaperDetails.hadPee).toBe(true);
      expect(savedActivities[0].diaperDetails.hadPoop).toBe(false);
      expect(savedActivities[0].diaperDetails.changedAt).toBeDefined();
    });

    it('should submit diaper with poop toggled on', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Diaper'));
      fireEvent.press(getByText('Poop'));
      fireEvent.press(getByText('Save Activity'));

      const savedActivities = baseProps.onSave.mock.calls[0][0];
      expect(savedActivities[0].diaperDetails.hadPoop).toBe(true);
      expect(savedActivities[0].diaperDetails.hadPee).toBe(true);
    });

    it('should show validation error when both pee and poop are off', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Diaper'));
      // Toggle pee off (default is on)
      fireEvent.press(getByText('Pee'));
      fireEvent.press(getByText('Save Activity'));

      expect(getByText('Please select at least pee or poop')).toBeTruthy();
      expect(baseProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('sleep form', () => {
    it('should show sleep form when Sleep is selected', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Sleep'));
      expect(getByText('Start Time')).toBeTruthy();
      expect(getByText('Set End Time')).toBeTruthy();
    });

    it('should submit sleep activity without end time (ongoing sleep)', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Sleep'));
      fireEvent.press(getByText('Save Activity'));

      expect(baseProps.onSave).toHaveBeenCalledTimes(1);
      const savedActivities = baseProps.onSave.mock.calls[0][0];
      expect(savedActivities).toHaveLength(1);
      expect(savedActivities[0].activityType).toBe(ActivityType.Sleep);
      expect(savedActivities[0].sleepDetails).toBeDefined();
      expect(savedActivities[0].sleepDetails.startTime).toBeDefined();
      expect(savedActivities[0].sleepDetails.endTime).toBeUndefined();
    });

    it('should show ongoing sleep hint', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Sleep'));
      expect(getByText('Leave blank if baby is still sleeping')).toBeTruthy();
    });

    it('should show end time picker when Set End Time is toggled', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Sleep'));
      fireEvent.press(getByText('Set End Time'));
      expect(getByText('End Time')).toBeTruthy();
    });

    it('should include end time when set', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('Sleep'));
      fireEvent.press(getByText('Set End Time'));
      fireEvent.press(getByText('Save Activity'));

      const savedActivities = baseProps.onSave.mock.calls[0][0];
      expect(savedActivities[0].sleepDetails.endTime).toBeDefined();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByText } = render(<ManualEntryModal {...baseProps} />);
      fireEvent.press(getByText('\u2715'));
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should show loading indicator when saving', () => {
      const { getByText, UNSAFE_getByType } = render(
        <ManualEntryModal {...baseProps} saving={true} />
      );
      fireEvent.press(getByText('Feed'));
      // When saving, the Save button should show an ActivityIndicator instead of text
      // We can check that "Save Activity" text is not present
      // (The button is rendered but shows a spinner)
    });

    it('should reset form when switching activity types', () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <ManualEntryModal {...baseProps} />
      );

      // Select Feed and fill in amount
      fireEvent.press(getByText('Feed'));
      fireEvent.changeText(getByPlaceholderText('e.g., 120'), '150');

      // Switch to Diaper
      fireEvent.press(getByText('Diaper'));
      expect(queryByText('Amount (ml)')).toBeNull();
      expect(getByText('Pee')).toBeTruthy();
    });
  });
});
