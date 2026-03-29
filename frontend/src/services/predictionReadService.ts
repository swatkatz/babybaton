import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@baby_baton:prediction_read:';

function getKey(predictedTime: string): string {
  return `${KEY_PREFIX}${predictedTime}`;
}

class PredictionReadService {
  async markAsRead(predictedTime: string): Promise<void> {
    await AsyncStorage.setItem(getKey(predictedTime), 'true');
  }

  async isRead(predictedTime: string): Promise<boolean> {
    const value = await AsyncStorage.getItem(getKey(predictedTime));
    return value === 'true';
  }

  async hasAnyUnread(predictedTime: string | null): Promise<boolean> {
    if (!predictedTime) {
      return false;
    }
    const read = await this.isRead(predictedTime);
    return !read;
  }
}

export default new PredictionReadService();
