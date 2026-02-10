import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityConfirmationModal } from './ActivityConfirmationModal';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }),
}));

const baseProps = {
  visible: true,
  rawText: 'Fed baby 120ml at 3pm',
  parsedActivities: [],
  errors: [],
  onConfirm: jest.fn(),
  onReRecord: jest.fn(),
  onCancel: jest.fn(),
};

describe('ActivityConfirmationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal title', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} />
      );
      expect(getByText('Confirm Activities')).toBeTruthy();
    });

    it('should display the raw transcribed text', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} />
      );
      expect(getByText('"Fed baby 120ml at 3pm"')).toBeTruthy();
    });

    it('should display "What you said:" section title', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} />
      );
      expect(getByText('What you said:')).toBeTruthy();
    });

    it('should display "Parsed activities:" section title', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} />
      );
      expect(getByText('Parsed activities:')).toBeTruthy();
    });
  });

  describe('no activities', () => {
    it('should show "No activities" message when parsedActivities is empty', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} parsedActivities={[]} />
      );
      expect(
        getByText('No activities were recognized. Please try again.')
      ).toBeTruthy();
    });

    it('should disable the Confirm button when no activities', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} parsedActivities={[]} />
      );
      const confirmButton = getByText('Confirm & Save');
      // The parent TouchableOpacity should be disabled
      // We fire press and verify onConfirm is NOT called
      fireEvent.press(confirmButton);
      expect(baseProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('feed activity', () => {
    it('should render a feed activity card', () => {
      const feedActivity = {
        activityType: 'FEED',
        feedDetails: {
          startTime: '2025-01-15T15:00:00Z',
          endTime: '2025-01-15T15:30:00Z',
          amountMl: 120,
          feedType: 'BREAST_MILK',
          durationMinutes: 30,
        },
      };

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[feedActivity]}
        />
      );

      expect(getByText('Feed')).toBeTruthy();
      expect(getByText(/Amount: 120ml/)).toBeTruthy();
      expect(getByText(/Type: breast milk/)).toBeTruthy();
      expect(getByText(/Duration: 30m/)).toBeTruthy();
    });

    it('should render feed without optional fields', () => {
      const feedActivity = {
        activityType: 'FEED',
        feedDetails: {
          startTime: '2025-01-15T15:00:00Z',
        },
      };

      const { getByText, queryByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[feedActivity]}
        />
      );

      expect(getByText('Feed')).toBeTruthy();
      expect(queryByText(/Amount:/)).toBeNull();
      expect(queryByText(/Type:/)).toBeNull();
      expect(queryByText(/Duration:/)).toBeNull();
    });
  });

  describe('diaper activity', () => {
    it('should render a diaper activity card with pee and poop', () => {
      const diaperActivity = {
        activityType: 'DIAPER',
        diaperDetails: {
          changedAt: '2025-01-15T16:00:00Z',
          hadPoop: true,
          hadPee: true,
        },
      };

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[diaperActivity]}
        />
      );

      expect(getByText('Diaper Change')).toBeTruthy();
      expect(getByText('Type: pee + poop')).toBeTruthy();
    });

    it('should render diaper with pee only', () => {
      const diaperActivity = {
        activityType: 'DIAPER',
        diaperDetails: {
          changedAt: '2025-01-15T16:00:00Z',
          hadPoop: false,
          hadPee: true,
        },
      };

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[diaperActivity]}
        />
      );

      expect(getByText('Diaper Change')).toBeTruthy();
      expect(getByText('Type: pee')).toBeTruthy();
    });
  });

  describe('sleep activity', () => {
    it('should render a sleep activity card', () => {
      const sleepActivity = {
        activityType: 'SLEEP',
        sleepDetails: {
          startTime: '2025-01-15T14:00:00Z',
          endTime: '2025-01-15T16:00:00Z',
          durationMinutes: 120,
          isActive: false,
        },
      };

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[sleepActivity]}
        />
      );

      expect(getByText('Sleep')).toBeTruthy();
      expect(getByText(/Duration: 2h/)).toBeTruthy();
    });

    it('should show Active tag when sleep is active', () => {
      const sleepActivity = {
        activityType: 'SLEEP',
        sleepDetails: {
          startTime: '2025-01-15T14:00:00Z',
          isActive: true,
        },
      };

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[sleepActivity]}
        />
      );

      expect(getByText('Active')).toBeTruthy();
    });
  });

  describe('errors', () => {
    it('should display error/warning messages', () => {
      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          errors={['Could not parse time', 'Unknown activity type']}
        />
      );

      expect(getByText('Warnings:')).toBeTruthy();
      expect(getByText(/Could not parse time/)).toBeTruthy();
      expect(getByText(/Unknown activity type/)).toBeTruthy();
    });

    it('should not display warnings section when errors array is empty', () => {
      const { queryByText } = render(
        <ActivityConfirmationModal {...baseProps} errors={[]} />
      );

      expect(queryByText('Warnings:')).toBeNull();
    });
  });

  describe('button interactions', () => {
    it('should call onConfirm when Confirm button is pressed with activities', () => {
      const feedActivity = {
        activityType: 'FEED',
        feedDetails: {
          startTime: '2025-01-15T15:00:00Z',
          amountMl: 120,
        },
      };

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={[feedActivity]}
        />
      );

      fireEvent.press(getByText('Confirm & Save'));
      expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onReRecord when Re-record button is pressed', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} />
      );

      fireEvent.press(getByText('Re-record'));
      expect(baseProps.onReRecord).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when close button is pressed', () => {
      const { getByText } = render(
        <ActivityConfirmationModal {...baseProps} />
      );

      // The close button has text "X" (actually Unicode)
      fireEvent.press(getByText('\u2715'));
      expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple activities', () => {
    it('should render multiple activity cards', () => {
      const activities = [
        {
          activityType: 'FEED',
          feedDetails: {
            startTime: '2025-01-15T15:00:00Z',
            amountMl: 120,
          },
        },
        {
          activityType: 'DIAPER',
          diaperDetails: {
            changedAt: '2025-01-15T16:00:00Z',
            hadPoop: true,
            hadPee: false,
          },
        },
        {
          activityType: 'SLEEP',
          sleepDetails: {
            startTime: '2025-01-15T14:00:00Z',
          },
        },
      ];

      const { getByText } = render(
        <ActivityConfirmationModal
          {...baseProps}
          parsedActivities={activities}
        />
      );

      expect(getByText('Feed')).toBeTruthy();
      expect(getByText('Diaper Change')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
    });
  });
});
