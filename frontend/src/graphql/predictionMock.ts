// src/graphql/predictionMock.ts

import { Prediction } from '../types/prediction';

/**
 * Mock data for NextFeedPrediction
 * TODO: Replace with GraphQL query result when backend is ready
 * Matches NextFeedPrediction type from GraphQL schema
 */

export const mockPrediction: Prediction = {
  predictedTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  confidence: 'HIGH' as const,
  minutesUntilFeed: 120,
  reasoning:
    'Based on 70ml feed at 2:00 PM, typically goes 3 hours between feeds',
};
