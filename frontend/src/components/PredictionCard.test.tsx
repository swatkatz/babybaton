import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PredictionCard } from './PredictionCard';
import { PredictionConfidence } from '../types/__generated__/graphql';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  ChevronRight: () => 'ChevronRight',
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

const makePrediction = (overrides?: Partial<any>) => ({
  __typename: 'NextFeedPrediction' as const,
  predictedTime: '2025-01-15T17:15:00Z',
  confidence: PredictionConfidence.High,
  minutesUntilFeed: 45,
  reasoning: 'Based on feeding pattern over the last 3 days',
  ...overrides,
});

describe('PredictionCard', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the prediction title', () => {
    const { getByText } = render(
      <PredictionCard prediction={makePrediction()} onPress={onPress} />
    );
    expect(getByText('Upcoming Feed')).toBeTruthy();
  });

  it('should render the subtitle with crystal ball emoji', () => {
    const { getByText } = render(
      <PredictionCard prediction={makePrediction()} onPress={onPress} />
    );
    expect(getByText(/Next Feed Prediction/)).toBeTruthy();
  });

  it('should display the formatted predicted time', () => {
    const { getByText } = render(
      <PredictionCard prediction={makePrediction()} onPress={onPress} />
    );
    // The component calls toLocaleTimeString which varies by environment
    // Just verify the "Scheduled for" prefix is there
    expect(getByText(/Scheduled for/)).toBeTruthy();
  });

  it('should display the confidence level', () => {
    const { getByText } = render(
      <PredictionCard prediction={makePrediction()} onPress={onPress} />
    );
    expect(getByText(/HIGH confidence/)).toBeTruthy();
  });

  it('should display MEDIUM confidence', () => {
    const prediction = makePrediction({
      confidence: PredictionConfidence.Medium,
    });
    const { getByText } = render(
      <PredictionCard prediction={prediction} onPress={onPress} />
    );
    expect(getByText(/MEDIUM confidence/)).toBeTruthy();
  });

  it('should display LOW confidence', () => {
    const prediction = makePrediction({
      confidence: PredictionConfidence.Low,
    });
    const { getByText } = render(
      <PredictionCard prediction={prediction} onPress={onPress} />
    );
    expect(getByText(/LOW confidence/)).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const { getByText } = render(
      <PredictionCard prediction={makePrediction()} onPress={onPress} />
    );
    fireEvent.press(getByText('Upcoming Feed'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
