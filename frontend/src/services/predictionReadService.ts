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

  /** Remove read entries for prediction IDs that no longer exist. */
  async pruneStale(currentIds: string[]): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const readKeys = allKeys.filter(k => k.startsWith(KEY_PREFIX));
    const currentKeySet = new Set(currentIds.map(getKey));
    const staleKeys = readKeys.filter(k => !currentKeySet.has(k));
    if (staleKeys.length > 0) {
      await AsyncStorage.multiRemove(staleKeys);
    }
  }
}

export default new PredictionReadService();
