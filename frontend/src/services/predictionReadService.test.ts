import AsyncStorage from '@react-native-async-storage/async-storage';
import predictionReadService from './predictionReadService';

describe('PredictionReadService', () => {
  beforeEach(() => {
    (AsyncStorage as any)._reset();
  });

  describe('isRead', () => {
    it('returns false for unread prediction', async () => {
      const result = await predictionReadService.isRead('pred-123');
      expect(result).toBe(false);
    });

    it('returns true after markAsRead', async () => {
      const predictionId = 'pred-123';
      await predictionReadService.markAsRead(predictionId);
      const result = await predictionReadService.isRead(predictionId);
      expect(result).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('writes correct key to AsyncStorage', async () => {
      const predictionId = 'pred-456';
      await predictionReadService.markAsRead(predictionId);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@baby_baton:prediction_read:pred-456',
        'true'
      );
    });
  });

  describe('hasAnyUnread', () => {
    it('returns true when at least one prediction is not read', async () => {
      const result = await predictionReadService.hasAnyUnread(['pred-1', 'pred-2']);
      expect(result).toBe(true);
    });

    it('returns false when all predictions are read', async () => {
      await predictionReadService.markAsRead('pred-1');
      await predictionReadService.markAsRead('pred-2');
      const result = await predictionReadService.hasAnyUnread(['pred-1', 'pred-2']);
      expect(result).toBe(false);
    });

    it('returns false when ids array is empty', async () => {
      const result = await predictionReadService.hasAnyUnread([]);
      expect(result).toBe(false);
    });
  });
});
