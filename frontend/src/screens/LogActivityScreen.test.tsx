import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LogActivityScreen } from './LogActivityScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
  getParent: jest.fn(),
  getState: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  getId: jest.fn(),
};

const mockRoute = {
  key: 'LogActivity',
  name: 'LogActivity' as const,
  params: undefined,
};

// Mock useMutation
const mockAddActivities = jest.fn();
jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockAddActivities],
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
  Pill: () => 'Pill',
  Ruler: () => 'Ruler',
}));

// Mock VoiceInputModal
let mockVoiceProps: Record<string, unknown> = {};
jest.mock('../components/VoiceInputModal', () => ({
  VoiceInputModal: (mockProps: any) => {
    mockVoiceProps = mockProps;
    if (!mockProps.visible) return null;
    const RN = require('react-native');
    return (
      <RN.View testID="voice-input-modal">
        <RN.TouchableOpacity testID="voice-parse-success" onPress={() => {
          mockProps.onActivitiesParsed({
            rawText: 'Fed baby 120ml',
            parsedActivities: [{ activityType: 'FEED', feedDetails: { startTime: '2025-01-01T12:00:00Z', amountMl: 120, feedType: 'FORMULA' } }],
            errors: [],
          });
        }}>
          <RN.Text>Simulate Parse</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="voice-switch-manual" onPress={() => {
          if (mockProps.onSwitchToManualEntry) mockProps.onSwitchToManualEntry();
        }}>
          <RN.Text>Switch to Manual</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock ActivityConfirmationModal
let mockConfirmProps: Record<string, unknown> = {};
jest.mock('../components/ActivityConfirmationModal', () => ({
  ActivityConfirmationModal: (mockProps: any) => {
    mockConfirmProps = mockProps;
    if (!mockProps.visible) return null;
    const RN = require('react-native');
    return (
      <RN.View testID="confirmation-modal">
        <RN.TouchableOpacity testID="confirm-save" onPress={() => mockProps.onConfirm()}>
          <RN.Text>Confirm</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="confirm-rerecord" onPress={() => mockProps.onReRecord()}>
          <RN.Text>Re-record</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock ManualEntryModal
let mockManualProps: Record<string, unknown> = {};
jest.mock('../components/ManualEntryModal', () => ({
  ManualEntryModal: (mockProps: any) => {
    mockManualProps = mockProps;
    if (!mockProps.visible) return null;
    const RN = require('react-native');
    return (
      <RN.View testID="manual-entry-modal">
        <RN.Text testID="manual-initial-type">{String(mockProps.initialActivityType ?? 'none')}</RN.Text>
        <RN.TouchableOpacity testID="manual-save" onPress={() => {
          mockProps.onSave([{
            activityType: 'FEED',
            feedDetails: { startTime: '2025-01-01T12:00:00Z', amountMl: 120, feedType: 'FORMULA' },
          }]);
        }}>
          <RN.Text>Save</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const RN = require('react-native');
  return { __esModule: true, default: () => <RN.View /> };
});

describe('LogActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoiceProps = {};
    mockConfirmProps = {};
    mockManualProps = {};
    mockAddActivities.mockResolvedValue({ data: { addActivities: { id: '1' } } });
  });

  describe('rendering', () => {
    it('renders voice input section with mic button', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      expect(getByTestId('mic-button')).toBeTruthy();
    });

    it('renders "Tap the microphone to start" text', () => {
      const { getByText } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      expect(getByText('Tap the microphone to start')).toBeTruthy();
    });

    it('renders example phrases', () => {
      const { getByText } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      expect(getByText(/Fed baby 120ml at 3pm/)).toBeTruthy();
      expect(getByText(/Changed diaper at 4pm, had poop/)).toBeTruthy();
      expect(getByText(/Baby slept from 2pm to 4pm/)).toBeTruthy();
    });

    it('renders Feed, Diaper, Sleep activity cards', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      expect(getByTestId('activity-card-feed')).toBeTruthy();
      expect(getByTestId('activity-card-diaper')).toBeTruthy();
      expect(getByTestId('activity-card-sleep')).toBeTruthy();
    });

    it('renders Meds and Growth as "Coming soon"', () => {
      const { getByTestId, getAllByText } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      expect(getByTestId('activity-card-meds')).toBeTruthy();
      expect(getByTestId('activity-card-growth')).toBeTruthy();
      expect(getAllByText('Coming soon')).toHaveLength(2);
    });

    it('renders "Or tap to log:" section title', () => {
      const { getByText } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      expect(getByText('Or tap to log:')).toBeTruthy();
    });
  });

  describe('voice input flow', () => {
    it('opens VoiceInputModal when mic button tapped', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('mic-button'));
      expect(getByTestId('voice-input-modal')).toBeTruthy();
    });

    it('opens ActivityConfirmationModal after voice parsing succeeds', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('mic-button'));
      fireEvent.press(getByTestId('voice-parse-success'));
      expect(getByTestId('confirmation-modal')).toBeTruthy();
    });

    it('calls addActivities and goBack on voice confirm', async () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('mic-button'));
      fireEvent.press(getByTestId('voice-parse-success'));
      fireEvent.press(getByTestId('confirm-save'));

      await waitFor(() => {
        expect(mockAddActivities).toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('strips non-schema fields (durationMinutes, isActive) before saving', async () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Open voice modal
      fireEvent.press(getByTestId('mic-button'));

      // Simulate AI parser returning extra fields not in GraphQL input types
      const voiceOnParsed = mockVoiceProps.onActivitiesParsed as (result: any) => void;
      act(() => {
        voiceOnParsed({
        rawText: 'Fed baby 120ml formula, changed diaper with poop, slept for 2 hours',
        parsedActivities: [
          {
            activityType: 'FEED',
            feedDetails: {
              startTime: '2025-01-01T12:00:00Z',
              endTime: '2025-01-01T12:30:00Z',
              amountMl: 120,
              feedType: 'FORMULA',
              foodName: undefined,
              quantity: undefined,
              quantityUnit: undefined,
              durationMinutes: 30, // extra field - not in FeedDetailsInput
            },
          },
          {
            activityType: 'DIAPER',
            diaperDetails: {
              changedAt: '2025-01-01T13:00:00Z',
              hadPoop: true,
              hadPee: false,
            },
          },
          {
            activityType: 'SLEEP',
            sleepDetails: {
              startTime: '2025-01-01T14:00:00Z',
              endTime: '2025-01-01T16:00:00Z',
              durationMinutes: 120, // extra field - not in SleepDetailsInput
              isActive: false, // extra field - not in SleepDetailsInput
            },
          },
        ],
        errors: [],
      });
      });

      // Confirm & Save
      fireEvent.press(getByTestId('confirm-save'));

      await waitFor(() => {
        expect(mockAddActivities).toHaveBeenCalledTimes(1);
        const { activities } = mockAddActivities.mock.calls[0][0].variables;

        // Feed: should NOT have durationMinutes
        expect(activities[0].feedDetails).toEqual({
          startTime: '2025-01-01T12:00:00Z',
          endTime: '2025-01-01T12:30:00Z',
          amountMl: 120,
          feedType: 'FORMULA',
          foodName: undefined,
          quantity: undefined,
          quantityUnit: undefined,
        });
        expect(activities[0].feedDetails).not.toHaveProperty('durationMinutes');

        // Diaper: should pass through cleanly
        expect(activities[1].diaperDetails).toEqual({
          changedAt: '2025-01-01T13:00:00Z',
          hadPoop: true,
          hadPee: false,
        });

        // Sleep: should NOT have durationMinutes or isActive
        expect(activities[2].sleepDetails).toEqual({
          startTime: '2025-01-01T14:00:00Z',
          endTime: '2025-01-01T16:00:00Z',
        });
        expect(activities[2].sleepDetails).not.toHaveProperty('durationMinutes');
        expect(activities[2].sleepDetails).not.toHaveProperty('isActive');
      });
    });

    it('shows alert on save error instead of navigating back', async () => {
      mockAddActivities.mockRejectedValueOnce(new Error('Network error'));
      jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('mic-button'));
      fireEvent.press(getByTestId('voice-parse-success'));
      fireEvent.press(getByTestId('confirm-save'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save activities. Please try again.');
        expect(mockGoBack).not.toHaveBeenCalled();
      });
    });
  });

  describe('manual entry flow', () => {
    it('opens ManualEntryModal with initialActivityType=FEED when Feed tapped', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('activity-card-feed'));
      expect(getByTestId('manual-entry-modal')).toBeTruthy();
      expect(getByTestId('manual-initial-type').props.children).toBe('FEED');
    });

    it('opens ManualEntryModal with initialActivityType=DIAPER when Diaper tapped', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('activity-card-diaper'));
      expect(getByTestId('manual-entry-modal')).toBeTruthy();
      expect(getByTestId('manual-initial-type').props.children).toBe('DIAPER');
    });

    it('opens ManualEntryModal with initialActivityType=SLEEP when Sleep tapped', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('activity-card-sleep'));
      expect(getByTestId('manual-entry-modal')).toBeTruthy();
      expect(getByTestId('manual-initial-type').props.children).toBe('SLEEP');
    });

    it('does NOT open modal when Meds tapped (disabled)', () => {
      const { getByTestId, queryByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('activity-card-meds'));
      expect(queryByTestId('manual-entry-modal')).toBeNull();
    });

    it('does NOT open modal when Growth tapped (disabled)', () => {
      const { getByTestId, queryByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('activity-card-growth'));
      expect(queryByTestId('manual-entry-modal')).toBeNull();
    });

    it('calls addActivities and goBack on manual save', async () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('activity-card-feed'));
      fireEvent.press(getByTestId('manual-save'));

      await waitFor(() => {
        expect(mockAddActivities).toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('voice to manual fallback', () => {
    it('switches to ManualEntryModal when voice input fails and user taps switch', () => {
      const { getByTestId } = render(
        <LogActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );
      fireEvent.press(getByTestId('mic-button'));
      fireEvent.press(getByTestId('voice-switch-manual'));
      expect(getByTestId('manual-entry-modal')).toBeTruthy();
    });
  });
});
