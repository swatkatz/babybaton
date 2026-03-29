import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictionDetailScreen } from './PredictionDetailScreen';

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
  predictedAmountMl: 120,
  predictedDurationMinutes: null,
  careSessionId: null,
};

function renderScreen(predictionId = 'pred-1') {
  return render(
    <PredictionDetailScreen
      navigation={{ goBack: jest.fn() } as any}
      route={{ key: 'detail', name: 'PredictionDetail', params: { predictionId } } as any}
    />
  );
}

describe('PredictionDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryResult = {
      data: { predictions: [{ ...basePrediction }] },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    };
  });

  it('renders prediction details for NEXT_FEED', () => {
    const { getByText } = renderScreen();
    expect(getByText('🍼')).toBeTruthy();
    expect(getByText('Next feed')).toBeTruthy();
    expect(getByText('High confidence')).toBeTruthy();
    expect(getByText('Baby has been feeding every 3 hours')).toBeTruthy();
    expect(getByText('~120 ml')).toBeTruthy();
  });

  it('renders prediction details for NEXT_NAP with duration', () => {
    mockQueryResult.data = {
      predictions: [{
        ...basePrediction,
        predictionType: 'NEXT_NAP',
        activityType: 'SLEEP',
        predictedAmountMl: null,
        predictedDurationMinutes: 90,
      }],
    };
    const { getByText } = renderScreen();
    expect(getByText('😴')).toBeTruthy();
    expect(getByText('Next nap')).toBeTruthy();
    expect(getByText('~90 min')).toBeTruthy();
  });

  it('renders prediction details for NEXT_WAKE', () => {
    mockQueryResult.data = {
      predictions: [{
        ...basePrediction,
        predictionType: 'NEXT_WAKE',
        activityType: 'SLEEP',
        predictedAmountMl: null,
        confidence: 'MEDIUM',
      }],
    };
    const { getByText } = renderScreen();
    expect(getByText('☀️')).toBeTruthy();
    expect(getByText('Next wake')).toBeTruthy();
    expect(getByText('Medium confidence')).toBeTruthy();
  });

  it('renders prediction details for BEDTIME', () => {
    mockQueryResult.data = {
      predictions: [{
        ...basePrediction,
        predictionType: 'BEDTIME',
        activityType: 'SLEEP',
        predictedAmountMl: null,
        confidence: 'LOW',
      }],
    };
    const { getByText } = renderScreen();
    expect(getByText('🌙')).toBeTruthy();
    expect(getByText('Bedtime')).toBeTruthy();
    expect(getByText('Low confidence')).toBeTruthy();
  });

  it('handles missing prediction gracefully', () => {
    mockQueryResult.data = { predictions: [] };
    const { getByText } = renderScreen('nonexistent');
    expect(getByText('Prediction not found')).toBeTruthy();
  });
});
