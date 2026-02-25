import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { MockLink } from '@apollo/client/testing';
import { CurrentSessionDetailScreen } from './CurrentSessionDetailScreen';
import {
  GetCurrentSessionDocument,
  DeleteActivityDocument,
  CareSessionStatus,
  ActivityType,
  FeedType,
} from '../types/__generated__/graphql';

// Mock navigation
const mockGoBack = jest.fn();

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

// Mock react-native-gesture-handler — render right actions inline so delete button is accessible
jest.mock('react-native-gesture-handler', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    Swipeable: ({ children, renderRightActions }: any) => {
      const actions = renderRightActions?.(
        { interpolate: () => 0 },
        { interpolate: () => 0 },
      );
      return (
        <View>
          {children}
          {actions}
        </View>
      );
    },
    GestureHandlerRootView: View,
    TouchableOpacity,
  };
});

// Mock colors module
jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    feed: '#5B9BD5',
    diaper: '#FFB6A3',
    sleep: '#B19CD9',
    error: '#FF6B6B',
    success: '#4CAF50',
  },
  getCaregiverColor: jest.fn(() => ({ bg: '#CFE2FF', text: '#0D6EFD' })),
}));

// Mock time utils
jest.mock('../utils/time', () => ({
  formatTime: jest.fn(() => '10:00 AM'),
  formatDuration: jest.fn(() => '2h 15m'),
}));

const mockSession = {
  __typename: 'CareSession' as const,
  id: 'session-1',
  status: CareSessionStatus.InProgress,
  startedAt: '2025-01-15T10:00:00Z',
  completedAt: null,
  notes: null,
  caregiver: {
    __typename: 'Caregiver' as const,
    id: 'cg-1',
    name: 'Jane',
    deviceId: 'device-1',
    deviceName: 'iPhone 15',
  },
  activities: [
    {
      __typename: 'FeedActivity' as const,
      id: 'feed-1',
      activityType: ActivityType.Feed,
      createdAt: '2025-01-15T10:30:00Z',
      feedDetails: {
        __typename: 'FeedDetails' as const,
        startTime: '2025-01-15T10:30:00Z',
        endTime: '2025-01-15T11:00:00Z',
        amountMl: 120,
        feedType: FeedType.BreastMilk,
        durationMinutes: 30,
      },
    },
  ],
  summary: {
    __typename: 'CareSessionSummary' as const,
    totalFeeds: 1,
    totalMl: 120,
    totalDiaperChanges: 0,
    totalSleepMinutes: 0,
    lastFeedTime: '2025-01-15T10:30:00Z',
    lastSleepTime: null,
    currentlyAsleep: false,
  },
};

function createMockClient(mocks: any[]) {
  const link = new MockLink(mocks);
  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
}

const renderScreen = (mocks: any[]) => {
  const client = createMockClient(mocks);
  return render(
    <ApolloProvider client={client}>
      <CurrentSessionDetailScreen
        navigation={{ goBack: mockGoBack } as any}
        route={{ key: 'test', name: 'CurrentSessionDetail' } as any}
      />
    </ApolloProvider>,
  );
};

describe('CurrentSessionDetailScreen - delete activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders activities from the session', async () => {
    const mocks = [
      {
        request: { query: GetCurrentSessionDocument },
        result: { data: { getCurrentSession: mockSession } },
      },
    ];

    const { findByText } = renderScreen(mocks);
    expect(await findByText(/Fed 120ml/)).toBeTruthy();
  });

  it('calls deleteActivity mutation when delete button is pressed', async () => {
    const deleteMutationFn = jest.fn(() => ({
      data: { deleteActivity: true },
    }));

    const mocks = [
      {
        request: { query: GetCurrentSessionDocument },
        result: { data: { getCurrentSession: mockSession } },
      },
      {
        request: {
          query: DeleteActivityDocument,
          variables: { activityId: 'feed-1' },
        },
        result: deleteMutationFn,
      },
      // Refetch after mutation
      {
        request: { query: GetCurrentSessionDocument },
        result: { data: { getCurrentSession: mockSession } },
      },
    ];

    const { findByText } = renderScreen(mocks);

    // Wait for initial render
    expect(await findByText(/Fed 120ml/)).toBeTruthy();

    // Press the delete button (rendered by Swipeable mock)
    const deleteButton = await findByText('Delete');
    fireEvent.press(deleteButton);

    // Verify the mutation was called
    await waitFor(() => {
      expect(deleteMutationFn).toHaveBeenCalled();
    });
  });

  it('shows alert on delete failure', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const mocks = [
      {
        request: { query: GetCurrentSessionDocument },
        result: { data: { getCurrentSession: mockSession } },
      },
      {
        request: {
          query: DeleteActivityDocument,
          variables: { activityId: 'feed-1' },
        },
        error: new Error('Network error'),
      },
    ];

    const { findByText } = renderScreen(mocks);

    expect(await findByText(/Fed 120ml/)).toBeTruthy();

    const deleteButton = await findByText('Delete');
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Network error'),
      );
    });

    alertSpy.mockRestore();
  });
});
