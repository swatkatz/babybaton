import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PredictionCard } from './PredictionCard';
import { PredictionConfidence, PredictionStatus, PredictionType, ActivityType } from '../types/__generated__/graphql';

const basePrediction = {
  __typename: 'Prediction' as const,
  id: 'pred-1',
  activityType: ActivityType.Feed,
  predictionType: PredictionType.NextFeed,
  predictedTime: new Date(Date.now() + 45 * 60000).toISOString(),
  status: PredictionStatus.Upcoming,
  confidence: PredictionConfidence.High,
  reasoning: 'Baby has been feeding every 3 hours',
  predictedAmountMl: 120,
  predictedDurationMinutes: null,
  careSessionId: null,
};

describe('PredictionCard', () => {
  describe('prediction type icons', () => {
    it('renders bottle icon for NEXT_FEED prediction', () => {
      const { getByText } = render(<PredictionCard prediction={basePrediction} />);
      expect(getByText('🍼')).toBeTruthy();
    });

    it('renders moon icon for NEXT_NAP prediction', () => {
      const { getByText } = render(
        <PredictionCard prediction={{ ...basePrediction, predictionType: PredictionType.NextNap, activityType: ActivityType.Sleep }} />
      );
      expect(getByText('😴')).toBeTruthy();
    });

    it('renders sun icon for NEXT_WAKE prediction', () => {
      const { getByText } = render(
        <PredictionCard prediction={{ ...basePrediction, predictionType: PredictionType.NextWake, activityType: ActivityType.Sleep }} />
      );
      expect(getByText('☀️')).toBeTruthy();
    });

    it('renders night icon for BEDTIME prediction', () => {
      const { getByText } = render(
        <PredictionCard prediction={{ ...basePrediction, predictionType: PredictionType.Bedtime, activityType: ActivityType.Sleep }} />
      );
      expect(getByText('🌙')).toBeTruthy();
    });
  });

  describe('OVERDUE status', () => {
    const overduePrediction = {
      ...basePrediction,
      status: PredictionStatus.Overdue,
      predictedTime: new Date(Date.now() - 15 * 60000).toISOString(),
    };

    it('renders OVERDUE card with overdue time text', () => {
      const { getByText } = render(<PredictionCard prediction={overduePrediction} />);
      expect(getByText(/AGO/)).toBeTruthy();
    });

    it('renders OVERDUE card with Log Activity CTA for NEXT_FEED', () => {
      const onLogActivity = jest.fn();
      const { getByText } = render(
        <PredictionCard prediction={overduePrediction} onLogActivity={onLogActivity} />
      );
      const button = getByText('Log Activity');
      fireEvent.press(button);
      expect(onLogActivity).toHaveBeenCalled();
    });

    it('renders OVERDUE card with Dismiss button', () => {
      const onDismiss = jest.fn();
      const { getByText } = render(
        <PredictionCard prediction={overduePrediction} onDismiss={onDismiss} />
      );
      const button = getByText('Dismiss');
      fireEvent.press(button);
      expect(onDismiss).toHaveBeenCalled();
    });

    it('renders OVERDUE NEXT_WAKE card with Mark as Awake CTA', () => {
      const onMarkAwake = jest.fn();
      const wakePrediction = {
        ...overduePrediction,
        predictionType: PredictionType.NextWake,
        activityType: ActivityType.Sleep,
        careSessionId: 'session-1',
      };
      const { getByText } = render(
        <PredictionCard prediction={wakePrediction} onMarkAwake={onMarkAwake} />
      );
      const button = getByText('Mark as Awake');
      fireEvent.press(button);
      expect(onMarkAwake).toHaveBeenCalled();
    });
  });

  describe('UPCOMING status', () => {
    it('renders UPCOMING card with confidence badge', () => {
      const { getByText } = render(<PredictionCard prediction={basePrediction} />);
      expect(getByText('High confidence')).toBeTruthy();
    });

    it('renders UPCOMING card with countdown', () => {
      const { getByText } = render(<PredictionCard prediction={basePrediction} />);
      expect(getByText(/min/)).toBeTruthy();
    });

    it('renders UPCOMING card with reasoning text', () => {
      const { getByText } = render(<PredictionCard prediction={basePrediction} />);
      expect(getByText('Baby has been feeding every 3 hours')).toBeTruthy();
    });
  });

  describe('PLANNED status', () => {
    const plannedPrediction = {
      ...basePrediction,
      status: PredictionStatus.Planned,
      confidence: PredictionConfidence.Low,
    };

    it('renders PLANNED card with ~ prefix on time', () => {
      const { getAllByText } = render(
        <PredictionCard prediction={plannedPrediction} />
      );
      // The formatted time should have a ~ prefix for PLANNED status
      const matches = getAllByText(/^~/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('predicted amounts', () => {
    it('renders predictedAmountMl for feed predictions', () => {
      const { getByText } = render(<PredictionCard prediction={basePrediction} />);
      expect(getByText('~120 ml')).toBeTruthy();
    });

    it('renders predictedDurationMinutes for nap predictions', () => {
      const napPrediction = {
        ...basePrediction,
        predictionType: PredictionType.NextNap,
        activityType: ActivityType.Sleep,
        predictedAmountMl: null,
        predictedDurationMinutes: 90,
      };
      const { getByText } = render(<PredictionCard prediction={napPrediction} />);
      expect(getByText('~90 min')).toBeTruthy();
    });

    it('does not render amount/duration when null', () => {
      const prediction = { ...basePrediction, predictedAmountMl: null };
      const { queryByText } = render(<PredictionCard prediction={prediction} />);
      expect(queryByText(/ml/)).toBeNull();
    });
  });

  describe('interactions', () => {
    it('fires onPress callback when card is tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <PredictionCard prediction={basePrediction} onPress={onPress} />
      );
      fireEvent.press(getByTestId('prediction-card'));
      expect(onPress).toHaveBeenCalled();
    });
  });
});
