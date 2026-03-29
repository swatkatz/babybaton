import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@baby_baton:prediction_read:';

function getKey(predictionId: string): string {
  return `${KEY_PREFIX}${predictionId}`;
}

class PredictionReadService {
  async markAsRead(predictionId: string): Promise<void> {
    await AsyncStorage.setItem(getKey(predictionId), 'true');
  }

  async isRead(predictionId: string): Promise<boolean> {
    const value = await AsyncStorage.getItem(getKey(predictionId));
    return value === 'true';
  }

  async hasAnyUnread(predictionIds: string[]): Promise<boolean> {
    if (predictionIds.length === 0) {
      return false;
    }
    for (const id of predictionIds) {
      const read = await this.isRead(id);
      if (!read) return true;
    }
    return false;
  }
}

export default new PredictionReadService();
