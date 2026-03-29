import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ScheduleGoalsScreen } from './ScheduleGoalsScreen';

// Mock Apollo Client
const mockUpdateGoals = jest.fn().mockResolvedValue({});
let mockQueryData: ReturnType<typeof makeGoalsData> | null = null;
let mockQueryLoading = false;
let mockQueryError: Error | null = null;

jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useQuery: jest.fn(() => ({
    data: mockQueryData,
    loading: mockQueryLoading,
    error: mockQueryError,
  })),
  useMutation: jest.fn(() => [mockUpdateGoals]),
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const { View, Text } = require('react-native');
  const MockDateTimePicker = (props: { value?: Date; testID?: string }) => (
    <View testID={props.testID}>
      <Text>{props.value?.toISOString()}</Text>
    </View>
  );
  MockDateTimePicker.default = MockDateTimePicker;
  return { __esModule: true, default: MockDateTimePicker };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    primaryLight: '#A8D5F2',
    primaryDark: '#2E6FA8',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
    error: '#FF6B6B',
  },
}));

function makeGoalsData(overrides: Record<string, unknown> = {}) {
  return {
    scheduleGoals: {
      __typename: 'ScheduleGoals' as const,
      targetWakeWindowMinutes: null as number | null,
      targetFeedIntervalMinutes: null as number | null,
      targetNapCount: null as number | null,
      maxDaytimeNapMinutes: null as number | null,
      targetBedtime: null as string | null,
      targetWakeTime: null as string | null,
      ...overrides,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockQueryData = null;
  mockQueryLoading = false;
  mockQueryError = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ScheduleGoalsScreen', () => {
  it('shows loading indicator while query is loading', () => {
    mockQueryLoading = true;
    const { getByTestId } = render(<ScheduleGoalsScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('shows error message when query fails', () => {
    mockQueryError = new Error('Network error');
    const { getByText } = render(<ScheduleGoalsScreen />);
    expect(getByText('Unable to load schedule goals')).toBeTruthy();
  });

  it('renders header text and all fields for empty state (null goals)', () => {
    mockQueryData = makeGoalsData();
    const { getByText, getByLabelText } = render(<ScheduleGoalsScreen />);

    expect(
      getByText("Set your targets and we'll blend them with observed patterns"),
    ).toBeTruthy();

    // Duration fields
    expect(getByText('Wake Window')).toBeTruthy();
    expect(getByText('Feed Interval')).toBeTruthy();
    expect(getByText('Max Daytime Sleep')).toBeTruthy();

    // Nap stepper
    expect(getByText('Naps Per Day')).toBeTruthy();
    expect(getByLabelText('Decrease nap count')).toBeTruthy();
    expect(getByLabelText('Increase nap count')).toBeTruthy();

    // Time fields
    expect(getByText('Bedtime')).toBeTruthy();
    expect(getByText('Wake Time')).toBeTruthy();
  });

  it('renders saved values: 150 min as 2h 30m', () => {
    mockQueryData = makeGoalsData({
      targetWakeWindowMinutes: 150,
      targetFeedIntervalMinutes: 210,
      targetNapCount: 3,
      maxDaytimeNapMinutes: 90,
      targetBedtime: '19:00',
      targetWakeTime: '07:00',
    });

    const { getByLabelText, getByText } = render(<ScheduleGoalsScreen />);

    // Wake Window: 150 min = 2h 30m
    expect(getByLabelText('Wake Window hours').props.value).toBe('2');
    expect(getByLabelText('Wake Window minutes').props.value).toBe('30');

    // Feed Interval: 210 min = 3h 30m
    expect(getByLabelText('Feed Interval hours').props.value).toBe('3');
    expect(getByLabelText('Feed Interval minutes').props.value).toBe('30');

    // Nap count
    expect(getByText('3')).toBeTruthy();

    // Max Nap: 90 min = 1h 30m
    expect(getByLabelText('Max Daytime Sleep hours').props.value).toBe('1');
    expect(getByLabelText('Max Daytime Sleep minutes').props.value).toBe('30');
  });

  it('entering 2h 30m triggers mutation with 150 minutes', async () => {
    mockQueryData = makeGoalsData();
    const { getByLabelText } = render(<ScheduleGoalsScreen />);

    fireEvent.changeText(getByLabelText('Wake Window hours'), '2');
    fireEvent.changeText(getByLabelText('Wake Window minutes'), '30');

    // Advance past debounce
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(mockUpdateGoals).toHaveBeenCalled();
      const lastCall = mockUpdateGoals.mock.calls[mockUpdateGoals.mock.calls.length - 1];
      expect(lastCall[0].variables.input.targetWakeWindowMinutes).toBe(150);
    });
  });

  it('entering only 45 minutes (hours blank) triggers mutation with 45', async () => {
    mockQueryData = makeGoalsData();
    const { getByLabelText } = render(<ScheduleGoalsScreen />);

    fireEvent.changeText(getByLabelText('Feed Interval minutes'), '45');

    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(mockUpdateGoals).toHaveBeenCalled();
      const lastCall = mockUpdateGoals.mock.calls[mockUpdateGoals.mock.calls.length - 1];
      expect(lastCall[0].variables.input.targetFeedIntervalMinutes).toBe(45);
    });
  });

  it('nap count stepper increments and decrements', async () => {
    mockQueryData = makeGoalsData({ targetNapCount: 2 });
    const { getByLabelText, getByText } = render(<ScheduleGoalsScreen />);

    expect(getByText('2')).toBeTruthy();

    fireEvent.press(getByLabelText('Increase nap count'));
    expect(getByText('3')).toBeTruthy();

    fireEvent.press(getByLabelText('Decrease nap count'));
    expect(getByText('2')).toBeTruthy();
  });

  it('nap count stepper does not go below 0', () => {
    mockQueryData = makeGoalsData({ targetNapCount: 0 });
    const { getByLabelText, getByText } = render(<ScheduleGoalsScreen />);

    expect(getByText('0')).toBeTruthy();

    // Decrease button should be disabled
    const decreaseBtn = getByLabelText('Decrease nap count');
    expect(decreaseBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('auto-save debounce: rapid changes trigger only one mutation', async () => {
    mockQueryData = makeGoalsData();
    const { getByLabelText } = render(<ScheduleGoalsScreen />);

    fireEvent.changeText(getByLabelText('Wake Window hours'), '1');
    fireEvent.changeText(getByLabelText('Wake Window hours'), '2');
    fireEvent.changeText(getByLabelText('Wake Window hours'), '3');

    jest.advanceTimersByTime(600);

    await waitFor(() => {
      // Only the last change should trigger a mutation
      expect(mockUpdateGoals).toHaveBeenCalledTimes(1);
    });
  });

  it('handles null goals (new family) with empty form', () => {
    mockQueryData = { scheduleGoals: null } as unknown as ReturnType<typeof makeGoalsData>;
    const { getByText, getByLabelText } = render(<ScheduleGoalsScreen />);

    expect(
      getByText("Set your targets and we'll blend them with observed patterns"),
    ).toBeTruthy();
    expect(getByLabelText('Wake Window hours').props.value).toBe('');
    expect(getByLabelText('Wake Window minutes').props.value).toBe('');
  });
});
