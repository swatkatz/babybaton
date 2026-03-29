import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { UpcomingScreen } from './UpcomingScreen';
import predictionReadService from '../services/predictionReadService';

// Mock navigation focus effect — delegate to useEffect so it runs once per deps change
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require('react');
    useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === 'function' ? cleanup : undefined;
    });
  },
}));

// Mock predictionReadService
jest.mock('../services/predictionReadService', () => ({
  __esModule: true,
  default: {
    isRead: jest.fn().mockResolvedValue(false),
    markAsRead: jest.fn().mockResolvedValue(undefined),
    hasAnyUnread: jest.fn().mockResolvedValue(true),
  },
}));

// Mock Apollo useQuery
let mockQueryResult: {
  data: { predictNextFeed: { __typename: string; predictedTime: string; confidence: string; minutesUntilFeed: number; reasoning: string | null } } | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: jest.Mock;
};

jest.mock('@apollo/client/react', () => ({
  useQuery: () => mockQueryResult,
}));

const basePrediction = {
  __typename: 'NextFeedPrediction' as const,
  predictedTime: '2026-03-29T18:30:00Z',
  confidence: 'HIGH' as const,
  minutesUntilFeed: 45,
  reasoning: 'Baby has been feeding every 3 hours',
};

describe('UpcomingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (predictionReadService.isRead as jest.Mock).mockResolvedValue(false);
    (predictionReadService.markAsRead as jest.Mock).mockResolvedValue(undefined);
    mockQueryResult = {
      data: { predictNextFeed: { ...basePrediction } },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    };
  });

  it('renders loading indicator when query is loading', () => {
    mockQueryResult = {
      data: undefined,
      loading: true,
      error: undefined,
      refetch: jest.fn(),
    };
    const { getByTestId } = render(<UpcomingScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('shows empty state when no prediction data', () => {
    mockQueryResult = {
      data: undefined,
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    };
    const { getByText } = render(<UpcomingScreen />);
    expect(getByText('No predictions yet')).toBeTruthy();
  });

  it('shows error state with retry button', () => {
    mockQueryResult = {
      data: undefined,
      loading: false,
      error: new Error('Network error'),
      refetch: jest.fn(),
    };
    const { getByText, getByTestId } = render(<UpcomingScreen />);
    expect(getByText('Failed to load predictions')).toBeTruthy();
    fireEvent.press(getByTestId('retry-button'));
    expect(mockQueryResult.refetch).toHaveBeenCalled();
  });

  describe('Predictions section', () => {
    it('renders section header', () => {
      const { getByText } = render(<UpcomingScreen />);
      expect(getByText(/PREDICTIONS/)).toBeTruthy();
    });

    it('renders predicted time', () => {
      const { getByText } = render(<UpcomingScreen />);
      expect(getByText('Next feed')).toBeTruthy();
    });

    it('renders confidence badge', () => {
      const { getByText } = render(<UpcomingScreen />);
      expect(getByText('High confidence')).toBeTruthy();
    });

    it('renders reasoning', () => {
      const { getByText } = render(<UpcomingScreen />);
      expect(getByText('Baby has been feeding every 3 hours')).toBeTruthy();
    });

    it('does not render reasoning when null', () => {
      mockQueryResult.data = {
        predictNextFeed: { ...basePrediction, reasoning: null },
      };
      const { queryByText } = render(<UpcomingScreen />);
      expect(queryByText('Baby has been feeding every 3 hours')).toBeNull();
    });
  });

  describe('Needs Attention section', () => {
    it('is NOT rendered when minutesUntilFeed > 10', () => {
      mockQueryResult.data = {
        predictNextFeed: { ...basePrediction, minutesUntilFeed: 30 },
      };
      const { queryByTestId } = render(<UpcomingScreen />);
      expect(queryByTestId('needs-attention-section')).toBeNull();
    });

    it('IS rendered when minutesUntilFeed <= 10', () => {
      mockQueryResult.data = {
        predictNextFeed: { ...basePrediction, minutesUntilFeed: 8 },
      };
      const { getByTestId, getByText } = render(<UpcomingScreen />);
      expect(getByTestId('needs-attention-section')).toBeTruthy();
      expect(getByText(/NEEDS ATTENTION/)).toBeTruthy();
    });

    it('IS rendered when minutesUntilFeed is 0 (overdue)', () => {
      mockQueryResult.data = {
        predictNextFeed: { ...basePrediction, minutesUntilFeed: 0 },
      };
      const { getByTestId } = render(<UpcomingScreen />);
      expect(getByTestId('needs-attention-section')).toBeTruthy();
    });

    it('IS rendered when minutesUntilFeed is negative', () => {
      mockQueryResult.data = {
        predictNextFeed: { ...basePrediction, minutesUntilFeed: -5 },
      };
      const { getByTestId } = render(<UpcomingScreen />);
      expect(getByTestId('needs-attention-section')).toBeTruthy();
    });
  });

  describe('Mark as read', () => {
    it('renders mark as read button when unread', () => {
      const { getByTestId } = render(<UpcomingScreen />);
      expect(getByTestId('mark-read-button')).toBeTruthy();
    });

    it('calls predictionReadService.markAsRead on tap', async () => {
      const { getByTestId } = render(<UpcomingScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('mark-read-button'));
      });
      expect(predictionReadService.markAsRead).toHaveBeenCalledWith(
        '2026-03-29T18:30:00Z'
      );
    });

    it('hides mark as read button after marking read', async () => {
      // After markAsRead is called, isRead should resolve to true on next check
      (predictionReadService.isRead as jest.Mock).mockResolvedValue(false);
      const { getByTestId, queryByTestId } = render(<UpcomingScreen />);

      // Button should be visible initially
      await waitFor(() => {
        expect(getByTestId('mark-read-button')).toBeTruthy();
      });

      // After marking read, the service now returns true
      (predictionReadService.isRead as jest.Mock).mockResolvedValue(true);
      await act(async () => {
        fireEvent.press(getByTestId('mark-read-button'));
      });
      await waitFor(() => {
        expect(queryByTestId('mark-read-button')).toBeNull();
      });
    });

    it('shows mark as read in needs attention section when imminent', () => {
      mockQueryResult.data = {
        predictNextFeed: { ...basePrediction, minutesUntilFeed: 5 },
      };
      const { getByTestId } = render(<UpcomingScreen />);
      expect(getByTestId('mark-read-button')).toBeTruthy();
    });
  });

  describe('Scheduled section', () => {
    it('is NOT rendered for MVP', () => {
      const { queryByText } = render(<UpcomingScreen />);
      expect(queryByText(/SCHEDULED/i)).toBeNull();
    });
  });
});
