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
type PredictionMock = {
  __typename: 'Prediction';
  id: string;
  activityType: string;
  predictionType: string;
  predictedTime: string;
  status: string;
  confidence: string | null;
  reasoning: string | null;
  predictedAmountMl: number | null;
  predictedDurationMinutes: number | null;
  careSessionId: string | null;
};

let mockQueryResult: {
  data: { predictions: PredictionMock[] } | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: jest.Mock;
};

jest.mock('@apollo/client/react', () => ({
  useQuery: () => mockQueryResult,
}));

const basePrediction: PredictionMock = {
  __typename: 'Prediction',
  id: 'pred-1',
  activityType: 'FEED',
  predictionType: 'NEXT_FEED',
  predictedTime: new Date(Date.now() + 45 * 60000).toISOString(),
  status: 'UPCOMING',
  confidence: 'HIGH',
  reasoning: 'Baby has been feeding every 3 hours',
  predictedAmountMl: null,
  predictedDurationMinutes: null,
  careSessionId: null,
};

describe('UpcomingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (predictionReadService.isRead as jest.Mock).mockResolvedValue(false);
    (predictionReadService.markAsRead as jest.Mock).mockResolvedValue(undefined);
    mockQueryResult = {
      data: { predictions: [{ ...basePrediction }] },
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

  it('shows empty state when no predictions', () => {
    mockQueryResult = {
      data: { predictions: [] },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    };
    const { getByText } = render(<UpcomingScreen />);
    expect(getByText('No predictions yet')).toBeTruthy();
  });

  it('shows empty state when data is undefined', () => {
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

    it('renders prediction label', () => {
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
        predictions: [{ ...basePrediction, reasoning: null }],
      };
      const { queryByText } = render(<UpcomingScreen />);
      expect(queryByText('Baby has been feeding every 3 hours')).toBeNull();
    });

    it('does not render confidence badge when null', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, confidence: null }],
      };
      const { queryByText } = render(<UpcomingScreen />);
      expect(queryByText(/confidence/)).toBeNull();
    });
  });

  describe('Needs Attention section', () => {
    it('is NOT rendered when status is UPCOMING', () => {
      const { queryByTestId } = render(<UpcomingScreen />);
      expect(queryByTestId('needs-attention-section')).toBeNull();
    });

    it('IS rendered when status is OVERDUE', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, status: 'OVERDUE', confidence: null }],
      };
      const { getByTestId, getByText } = render(<UpcomingScreen />);
      expect(getByTestId('needs-attention-section')).toBeTruthy();
      expect(getByText(/NEEDS ATTENTION/)).toBeTruthy();
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
      expect(predictionReadService.markAsRead).toHaveBeenCalledWith('pred-1');
    });

    it('hides mark as read button after marking read', async () => {
      (predictionReadService.isRead as jest.Mock).mockResolvedValue(false);
      const { getByTestId, queryByTestId } = render(<UpcomingScreen />);

      await waitFor(() => {
        expect(getByTestId('mark-read-button')).toBeTruthy();
      });

      (predictionReadService.isRead as jest.Mock).mockResolvedValue(true);
      await act(async () => {
        fireEvent.press(getByTestId('mark-read-button'));
      });
      await waitFor(() => {
        expect(queryByTestId('mark-read-button')).toBeNull();
      });
    });

    it('shows mark as read in needs attention section when overdue', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, status: 'OVERDUE', confidence: null }],
      };
      const { getAllByTestId } = render(<UpcomingScreen />);
      expect(getAllByTestId('mark-read-button').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scheduled section', () => {
    it('is NOT rendered for MVP', () => {
      const { queryByText } = render(<UpcomingScreen />);
      expect(queryByText(/SCHEDULED/i)).toBeNull();
    });
  });

  describe('Multiple prediction types', () => {
    it('renders different emojis for different prediction types', () => {
      mockQueryResult.data = {
        predictions: [
          { ...basePrediction, id: 'pred-1', predictionType: 'NEXT_FEED' },
          { ...basePrediction, id: 'pred-2', predictionType: 'NEXT_NAP', activityType: 'SLEEP' },
        ],
      };
      const { getByText } = render(<UpcomingScreen />);
      expect(getByText('Next feed')).toBeTruthy();
      expect(getByText('Next nap')).toBeTruthy();
    });
  });
});
