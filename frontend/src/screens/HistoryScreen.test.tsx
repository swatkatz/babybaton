import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { HistoryScreen } from './HistoryScreen';
import { CareSessionStatus, ActivityType, FeedType } from '../types/__generated__/graphql';

// Mock Apollo Client
const mockRefetch = jest.fn().mockResolvedValue({});
const mockFetchMore = jest.fn().mockResolvedValue({});
let mockHistoryData: any = null;
let mockHistoryLoading = false;
let mockHistoryError: any = null;
let mockCurrentSessionData: any = null;

jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useQuery: jest.fn((doc: any) => {
    const docName = doc?.definitions?.[0]?.name?.value;
    if (docName === 'GetCurrentSession') {
      return {
        data: mockCurrentSessionData,
        loading: false,
        error: null,
      };
    }
    // GetCareSessionHistory
    return {
      data: mockHistoryData,
      loading: mockHistoryLoading,
      error: mockHistoryError,
      fetchMore: mockFetchMore,
      refetch: mockRefetch,
    };
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    getParent: () => ({ navigate: jest.fn() }),
  }),
}));

jest.mock('lucide-react-native', () => ({
  Search: () => 'Search',
  X: () => 'X',
  ChevronRight: () => 'ChevronRight',
  Utensils: () => 'Utensils',
  Droplets: () => 'Droplets',
  Moon: () => 'Moon',
}));

jest.mock('react-native-gesture-handler', () => ({
  Swipeable: ({ children }: any) => children,
  TouchableOpacity: ({ children, onPress }: any) => {
    const { TouchableOpacity: RNTouchable } = require('react-native');
    return <RNTouchable onPress={onPress}>{children}</RNTouchable>;
  },
}));

jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
    feed: '#5B9BD5',
    diaper: '#FFB6A3',
    sleep: '#B19CD9',
    success: '#7BC96F',
    error: '#FF6B6B',
  },
  getCaregiverColor: jest.fn(() => ({ bg: '#CFE2FF', text: '#0D6EFD' })),
}));

jest.mock('../utils/time', () => ({
  formatTime: jest.fn(() => '10:00 AM'),
  formatDuration: jest.fn(() => '2h 0m'),
  formatMinutesToDuration: jest.fn((min: number) => {
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return `${mins}m`;
  }),
}));

const makeEdge = (session: any) => ({
  __typename: 'CareSessionEdge' as const,
  cursor: `cursor-${session.id}`,
  node: session,
});

const makeSession = (overrides: any = {}) => ({
  __typename: 'CareSession' as const,
  id: 'session-1',
  status: CareSessionStatus.Completed,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  caregiver: { __typename: 'Caregiver' as const, id: 'cg-1', name: 'Swati' },
  activities: [
    {
      __typename: 'FeedActivity' as const,
      id: 'feed-1',
      activityType: ActivityType.Feed,
      createdAt: new Date().toISOString(),
      feedDetails: {
        __typename: 'FeedDetails' as const,
        startTime: new Date().toISOString(),
        endTime: null,
        amountMl: 90,
        feedType: FeedType.Formula,
        durationMinutes: null,
        foodName: null,
        quantity: null,
        quantityUnit: null,
      },
    },
  ],
  summary: {
    __typename: 'CareSessionSummary' as const,
    totalFeeds: 1,
    totalMl: 90,
    totalDiaperChanges: 0,
    totalSleepMinutes: 0,
  },
  notes: null,
  ...overrides,
});

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryData = null;
    mockHistoryLoading = false;
    mockHistoryError = null;
    mockCurrentSessionData = null;
  });

  it('shows loading indicator while initial query is in flight', () => {
    mockHistoryLoading = true;
    const { getByTestId, getByText } = render(<HistoryScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
    expect(getByText('Loading history...')).toBeTruthy();
  });

  it('shows empty state when no sessions and no current session', () => {
    mockHistoryData = {
      getCareSessionHistory: {
        __typename: 'CareSessionConnection',
        edges: [],
        pageInfo: {
          __typename: 'CareSessionPageInfo',
          hasNextPage: false,
          endCursor: null,
        },
      },
    };
    mockCurrentSessionData = { getCurrentSession: null };

    const { getByText } = render(<HistoryScreen />);
    expect(getByText('No sessions yet')).toBeTruthy();
  });

  it('renders sessions in browse mode', () => {
    const now = new Date();
    mockHistoryData = {
      getCareSessionHistory: {
        __typename: 'CareSessionConnection',
        edges: [
          makeEdge(makeSession({
            id: 's1',
            startedAt: now.toISOString(),
            completedAt: now.toISOString(),
          })),
        ],
        pageInfo: {
          __typename: 'CareSessionPageInfo',
          hasNextPage: false,
          endCursor: null,
        },
      },
    };
    mockCurrentSessionData = { getCurrentSession: null };

    const { getByText } = render(<HistoryScreen />);
    expect(getByText('Swati')).toBeTruthy();
    expect(getByText('Today')).toBeTruthy();
  });

  it('shows current session as compact card under Today', () => {
    const now = new Date();
    mockHistoryData = {
      getCareSessionHistory: {
        __typename: 'CareSessionConnection',
        edges: [
          makeEdge(makeSession({
            id: 's1',
            startedAt: now.toISOString(),
          })),
        ],
        pageInfo: {
          __typename: 'CareSessionPageInfo',
          hasNextPage: false,
          endCursor: null,
        },
      },
    };
    mockCurrentSessionData = {
      getCurrentSession: {
        __typename: 'CareSession',
        id: 'current-1',
        status: CareSessionStatus.InProgress,
        startedAt: now.toISOString(),
        completedAt: null,
        caregiver: { __typename: 'Caregiver', id: 'cg-2', name: 'Amit' },
        activities: [
          {
            __typename: 'FeedActivity',
            id: 'f1',
            activityType: ActivityType.Feed,
            createdAt: now.toISOString(),
            feedDetails: null,
          },
          {
            __typename: 'DiaperActivity',
            id: 'd1',
            activityType: ActivityType.Diaper,
            createdAt: now.toISOString(),
            diaperDetails: null,
          },
        ],
        summary: {
          __typename: 'CareSessionSummary',
          totalFeeds: 1,
          totalMl: 90,
          totalDiaperChanges: 1,
          totalSleepMinutes: 0,
          lastFeedTime: null,
          lastSleepTime: null,
          currentlyAsleep: false,
        },
        notes: null,
      },
    };

    const { getByTestId, getByText } = render(<HistoryScreen />);
    expect(getByTestId('compact-current-session')).toBeTruthy();
    expect(getByText('Amit')).toBeTruthy();
    expect(getByText('2 activities')).toBeTruthy();
  });

  it('shows error state with retry', () => {
    mockHistoryError = new Error('Network error');
    const { getByText } = render(<HistoryScreen />);
    expect(getByText('Failed to load history')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();

    fireEvent.press(getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders search bar', () => {
    mockHistoryData = {
      getCareSessionHistory: {
        __typename: 'CareSessionConnection',
        edges: [],
        pageInfo: {
          __typename: 'CareSessionPageInfo',
          hasNextPage: false,
          endCursor: null,
        },
      },
    };
    mockCurrentSessionData = { getCurrentSession: null };

    const { getByPlaceholderText } = render(<HistoryScreen />);
    expect(getByPlaceholderText('Search activities...')).toBeTruthy();
  });

  it('renders filter chips', () => {
    mockHistoryData = {
      getCareSessionHistory: {
        __typename: 'CareSessionConnection',
        edges: [],
        pageInfo: {
          __typename: 'CareSessionPageInfo',
          hasNextPage: false,
          endCursor: null,
        },
      },
    };
    mockCurrentSessionData = { getCurrentSession: null };

    const { getByText } = render(<HistoryScreen />);
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Feed')).toBeTruthy();
    expect(getByText('Diaper')).toBeTruthy();
    expect(getByText('Sleep')).toBeTruthy();
  });
});
