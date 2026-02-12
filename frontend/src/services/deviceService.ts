import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@baby_baton:device_id';

class DeviceService {
  private deviceId: string | null = null;

  async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    // Try to get stored device ID first
    const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (storedId) {
      this.deviceId = storedId;
      return storedId;
    }

    // Generate a UUID and persist it
    const newDeviceId = this.generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    this.deviceId = newDeviceId;

    return newDeviceId;
  }

  async getDeviceName(): Promise<string> {
    if (Platform.OS === 'web') {
      return `${this.getBrowserName()} Browser`;
    }

    return Device.modelName ?? Device.deviceName ?? 'Unknown Device';
  }

  async clearDeviceId(): Promise<void> {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    this.deviceId = null;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Web';
  }
}

export default new DeviceService();
