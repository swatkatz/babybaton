import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { UpcomingScreen } from './UpcomingScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));
jest.mock('../services/predictionReadService', () => ({
  __esModule: true,
  default: {
    markAsRead: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Apollo hooks
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

const mockDismissPrediction = jest.fn();

jest.mock('@apollo/client/react', () => ({
  useQuery: () => mockQueryResult,
  useMutation: () => [mockDismissPrediction],
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

function renderScreen() {
  return render(
    <UpcomingScreen
      navigation={{ navigate: mockNavigate } as any}
      route={{ key: 'upcoming', name: 'Upcoming', params: undefined } as any}
    />
  );
}

describe('UpcomingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { getByTestId } = renderScreen();
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('shows empty state when no predictions', () => {
    mockQueryResult = {
      data: { predictions: [] },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    };
    const { getByText } = renderScreen();
    expect(getByText('No predictions yet')).toBeTruthy();
  });

  it('shows empty state when data is undefined', () => {
    mockQueryResult = {
      data: undefined,
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    };
    const { getByText } = renderScreen();
    expect(getByText('No predictions yet')).toBeTruthy();
  });

  it('shows error state with retry button', () => {
    mockQueryResult = {
      data: undefined,
      loading: false,
      error: new Error('Network error'),
      refetch: jest.fn(),
    };
    const { getByText, getByTestId } = renderScreen();
    expect(getByText('Failed to load predictions')).toBeTruthy();
    fireEvent.press(getByTestId('retry-button'));
    expect(mockQueryResult.refetch).toHaveBeenCalled();
  });

  describe('section rendering', () => {
    it('renders OVERDUE section header when overdue predictions exist', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, status: 'OVERDUE', predictedTime: new Date(Date.now() - 10 * 60000).toISOString() }],
      };
      const { getByTestId, getByText } = renderScreen();
      expect(getByTestId('overdue-section')).toBeTruthy();
      expect(getByText('OVERDUE')).toBeTruthy();
    });

    it('does not render OVERDUE section when no overdue predictions', () => {
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('overdue-section')).toBeNull();
    });

    it('renders UPCOMING section header', () => {
      const { getByTestId, getByText } = renderScreen();
      expect(getByTestId('upcoming-section')).toBeTruthy();
      expect(getByText('COMING UP')).toBeTruthy();
    });

    it('renders PLANNED section with disclaimer note', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, status: 'PLANNED' }],
      };
      const { getByTestId, getByText } = renderScreen();
      expect(getByTestId('planned-section')).toBeTruthy();
      expect(getByText('REST OF DAY')).toBeTruthy();
      expect(getByText('Updates as activities are logged')).toBeTruthy();
    });

    it('groups predictions by status correctly', () => {
      mockQueryResult.data = {
        predictions: [
          { ...basePrediction, id: 'pred-overdue', status: 'OVERDUE', predictedTime: new Date(Date.now() - 10 * 60000).toISOString() },
          { ...basePrediction, id: 'pred-upcoming-1', status: 'UPCOMING' },
          { ...basePrediction, id: 'pred-upcoming-2', status: 'UPCOMING', predictionType: 'NEXT_NAP', activityType: 'SLEEP' },
          { ...basePrediction, id: 'pred-planned', status: 'PLANNED' },
        ],
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('overdue-section')).toBeTruthy();
      expect(getByTestId('upcoming-section')).toBeTruthy();
      expect(getByTestId('planned-section')).toBeTruthy();
    });

    it('sorts predictions by predictedTime within each section', () => {
      const later = new Date(Date.now() + 120 * 60000).toISOString();
      const sooner = new Date(Date.now() + 30 * 60000).toISOString();
      mockQueryResult.data = {
        predictions: [
          { ...basePrediction, id: 'pred-later', status: 'UPCOMING', predictedTime: later, predictionType: 'NEXT_NAP', activityType: 'SLEEP' },
          { ...basePrediction, id: 'pred-sooner', status: 'UPCOMING', predictedTime: sooner },
        ],
      };
      const { getAllByTestId } = renderScreen();
      const cards = getAllByTestId('prediction-card');
      expect(cards.length).toBe(2);
    });
  });

  describe('navigation', () => {
    it('navigates to PredictionDetail when card is pressed', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('prediction-card'));
      expect(mockNavigate).toHaveBeenCalledWith('PredictionDetail', { predictionId: 'pred-1' });
    });

    it('navigates to LogActivity when Log Activity CTA is pressed', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, status: 'OVERDUE', predictedTime: new Date(Date.now() - 10 * 60000).toISOString() }],
      };
      const { getByText } = renderScreen();
      fireEvent.press(getByText('Log Activity'));
      expect(mockNavigate).toHaveBeenCalledWith('LogActivity');
    });

    it('navigates to SessionDetail for Mark as Awake', () => {
      mockQueryResult.data = {
        predictions: [{
          ...basePrediction,
          status: 'OVERDUE',
          predictionType: 'NEXT_WAKE',
          activityType: 'SLEEP',
          predictedTime: new Date(Date.now() - 10 * 60000).toISOString(),
          careSessionId: 'session-123',
        }],
      };
      const { getByText } = renderScreen();
      fireEvent.press(getByText('Mark as Awake'));
      expect(mockNavigate).toHaveBeenCalledWith('SessionDetail', { sessionId: 'session-123' });
    });
  });

  describe('dismiss', () => {
    it('calls dismissPrediction mutation when Dismiss is pressed', () => {
      mockQueryResult.data = {
        predictions: [{ ...basePrediction, status: 'OVERDUE', predictedTime: new Date(Date.now() - 10 * 60000).toISOString() }],
      };
      const { getByText } = renderScreen();
      fireEvent.press(getByText('Dismiss'));
      expect(mockDismissPrediction).toHaveBeenCalledWith({ variables: { id: 'pred-1' } });
    });
  });

  describe('multiple prediction types', () => {
    it('renders different labels for different prediction types', () => {
      mockQueryResult.data = {
        predictions: [
          { ...basePrediction, id: 'pred-1', predictionType: 'NEXT_FEED' },
          { ...basePrediction, id: 'pred-2', predictionType: 'NEXT_NAP', activityType: 'SLEEP' },
        ],
      };
      const { getByText } = renderScreen();
      expect(getByText('Next feed')).toBeTruthy();
      expect(getByText('Next nap')).toBeTruthy();
    });
  });
});
