import AsyncStorage from '@react-native-async-storage/async-storage';
import predictionReadService from './predictionReadService';

describe('PredictionReadService', () => {
  beforeEach(() => {
    (AsyncStorage as any)._reset();
  });

  describe('isRead', () => {
    it('returns false for unread prediction', async () => {
      const result = await predictionReadService.isRead('2026-03-29T18:30:00Z');
      expect(result).toBe(false);
    });

    it('returns true after markAsRead', async () => {
      const predictedTime = '2026-03-29T18:30:00Z';
      await predictionReadService.markAsRead(predictedTime);
      const result = await predictionReadService.isRead(predictedTime);
      expect(result).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('writes correct key to AsyncStorage', async () => {
      const predictedTime = '2026-03-29T18:30:00Z';
      await predictionReadService.markAsRead(predictedTime);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@baby_baton:prediction_read:2026-03-29T18:30:00Z',
        'true'
      );
    });
  });

  describe('hasAnyUnread', () => {
    it('returns true when prediction is not read', async () => {
      const result = await predictionReadService.hasAnyUnread('2026-03-29T18:30:00Z');
      expect(result).toBe(true);
    });

    it('returns false when prediction is read', async () => {
      const predictedTime = '2026-03-29T18:30:00Z';
      await predictionReadService.markAsRead(predictedTime);
      const result = await predictionReadService.hasAnyUnread(predictedTime);
      expect(result).toBe(false);
    });

    it('returns false when predictedTime is null', async () => {
      const result = await predictionReadService.hasAnyUnread(null);
      expect(result).toBe(false);
    });
  });
});
