export interface Prediction {
  predictedTime: Date;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  minutesUntilFeed: number;
  reasoning?: string;
}
