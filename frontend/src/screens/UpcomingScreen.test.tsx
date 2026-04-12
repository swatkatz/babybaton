import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
    pruneStale: jest.fn().mockResolvedValue(undefined),
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
let lastUseMutationOptions: { update?: (...args: unknown[]) => void } | undefined;

jest.mock('@apollo/client/react', () => ({
  useQuery: () => mockQueryResult,
  useMutation: (_doc: unknown, options?: { update?: (...args: unknown[]) => void }) => {
    lastUseMutationOptions = options;
    return [mockDismissPrediction];
  },
}));

const baseFeedPrediction: PredictionMock = {
  __typename: 'Prediction',
  id: 'pred-feed',
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

const baseNapPrediction: PredictionMock = {
  ...baseFeedPrediction,
  id: 'pred-nap',
  activityType: 'SLEEP',
  predictionType: 'NEXT_NAP',
  predictedTime: new Date(Date.now() + 30 * 60000).toISOString(),
  reasoning: 'Wake window has been ~2 hours',
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
    lastUseMutationOptions = undefined;
    mockQueryResult = {
      data: { predictions: [{ ...baseFeedPrediction }] },
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

  describe('highlights selection', () => {
    it('shows the next feed and the next sleep prediction (max 2 cards)', () => {
      mockQueryResult.data = {
        predictions: [
          { ...baseFeedPrediction, id: 'feed-1' },
          { ...baseNapPrediction, id: 'nap-1' },
          // Bedtime later than nap — should be ignored in favor of nap
          { ...baseNapPrediction, id: 'bedtime-1', predictionType: 'BEDTIME', predictedTime: new Date(Date.now() + 6 * 60 * 60000).toISOString() },
        ],
      };
      const { getAllByTestId } = renderScreen();
      expect(getAllByTestId('prediction-card')).toHaveLength(2);
    });

    it('shows just one card when only a feed prediction exists', () => {
      mockQueryResult.data = { predictions: [{ ...baseFeedPrediction }] };
      const { getAllByTestId } = renderScreen();
      expect(getAllByTestId('prediction-card')).toHaveLength(1);
    });

    it('does not show any chained PLANNED predictions', () => {
      mockQueryResult.data = {
        predictions: [
          { ...baseFeedPrediction, id: 'feed-now' },
          { ...baseFeedPrediction, id: 'feed-planned', status: 'PLANNED', predictedTime: new Date(Date.now() + 4 * 60 * 60000).toISOString() },
        ],
      };
      const { getAllByTestId } = renderScreen();
      // Both are NEXT_FEED, so we only keep the soonest one regardless of status.
      expect(getAllByTestId('prediction-card')).toHaveLength(1);
    });

    it('picks the soonest sleep-type prediction when multiple exist', () => {
      const soonNap = { ...baseNapPrediction, id: 'nap-soon', predictedTime: new Date(Date.now() + 20 * 60000).toISOString() };
      const laterBedtime = { ...baseNapPrediction, id: 'bedtime', predictionType: 'BEDTIME', predictedTime: new Date(Date.now() + 6 * 60 * 60000).toISOString() };
      mockQueryResult.data = { predictions: [laterBedtime, soonNap] };
      const { getByText, queryByText } = renderScreen();
      expect(getByText('Next nap')).toBeTruthy();
      expect(queryByText('Bedtime')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('navigates to PredictionDetail when card is pressed', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('prediction-card'));
      expect(mockNavigate).toHaveBeenCalledWith('PredictionDetail', { predictionId: 'pred-feed' });
    });

    it('calls dismissPrediction when Done is pressed on overdue card', () => {
      mockQueryResult.data = {
        predictions: [{ ...baseFeedPrediction, status: 'OVERDUE', predictedTime: new Date(Date.now() - 10 * 60000).toISOString() }],
      };
      const { getByText } = renderScreen();
      fireEvent.press(getByText('Done'));
      expect(mockDismissPrediction).toHaveBeenCalledWith({ variables: { id: 'pred-feed' } });
    });

    it('calls dismissPrediction mutation when Skipped is pressed', () => {
      mockQueryResult.data = {
        predictions: [{ ...baseFeedPrediction, status: 'OVERDUE', predictedTime: new Date(Date.now() - 10 * 60000).toISOString() }],
      };
      const { getByText } = renderScreen();
      fireEvent.press(getByText('Skipped'));
      expect(mockDismissPrediction).toHaveBeenCalledWith({ variables: { id: 'pred-feed' } });
    });
  });

  describe('cache update on dismiss', () => {
    it('removes the dismissed prediction from the predictions cache field', () => {
      renderScreen();
      // Pull the update fn passed to useMutation and exercise it directly.
      const update = lastUseMutationOptions?.update;
      expect(typeof update).toBe('function');

      const filterFnByField: Record<string, (refs: { __ref: string }[], helpers: { readField: (field: string, ref: { __ref: string }) => string }) => unknown> = {};
      const cache = {
        modify: ({ fields }: { fields: Record<string, (refs: { __ref: string }[], helpers: { readField: (field: string, ref: { __ref: string }) => string }) => unknown> }) => {
          Object.assign(filterFnByField, fields);
        },
      };

      update?.(cache, undefined, { variables: { id: 'pred-feed' } });
      const predictionsField = filterFnByField.predictions;
      expect(predictionsField).toBeDefined();

      const refs = [
        { __ref: 'Prediction:pred-feed' },
        { __ref: 'Prediction:pred-other' },
      ];
      const readField = (_field: string, ref: { __ref: string }): string =>
        ref.__ref.split(':')[1] ?? '';
      const result = predictionsField(refs, { readField }) as { __ref: string }[];
      expect(result).toEqual([{ __ref: 'Prediction:pred-other' }]);
    });
  });

  describe('multiple prediction types', () => {
    it('renders the right labels for different prediction types', () => {
      mockQueryResult.data = {
        predictions: [
          { ...baseFeedPrediction, id: 'pred-1', predictionType: 'NEXT_FEED' },
          { ...baseNapPrediction, id: 'pred-2', predictionType: 'NEXT_NAP' },
        ],
      };
      const { getByText } = renderScreen();
      expect(getByText('Next feed')).toBeTruthy();
      expect(getByText('Next nap')).toBeTruthy();
    });
  });
});
