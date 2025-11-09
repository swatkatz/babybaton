import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  FAMILY_ID: '@baby_baton:family_id',
  CAREGIVER_ID: '@baby_baton:caregiver_id',
  CAREGIVER_NAME: '@baby_baton:caregiver_name',
  FAMILY_NAME: '@baby_baton:family_name',
  BABY_NAME: '@baby_baton:baby_name',
};

export interface AuthData {
  familyId: string;
  caregiverId: string;
  caregiverName: string;
  familyName: string;
  babyName: string;
}

class AuthService {
  async saveAuth(data: AuthData): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.FAMILY_ID, data.familyId],
      [KEYS.CAREGIVER_ID, data.caregiverId],
      [KEYS.CAREGIVER_NAME, data.caregiverName],
      [KEYS.FAMILY_NAME, data.familyName],
      [KEYS.BABY_NAME, data.babyName],
    ]);
  }

  async getAuth(): Promise<AuthData | null> {
    const values = await AsyncStorage.multiGet([
      KEYS.FAMILY_ID,
      KEYS.CAREGIVER_ID,
      KEYS.CAREGIVER_NAME,
      KEYS.FAMILY_NAME,
      KEYS.BABY_NAME,
    ]);

    const [familyId, caregiverId, caregiverName, familyName, babyName] = values.map(
      ([_, value]) => value
    );

    // Check required values exist (caregiverName is optional for backward compatibility)
    if (!familyId || !caregiverId || !familyName || !babyName) {
      return null;
    }

    // Use familyName as fallback if caregiverName is missing (for existing users)
    const finalCaregiverName = caregiverName || familyName.split(' ')[0] || 'User';

    return { familyId, caregiverId, caregiverName: finalCaregiverName, familyName, babyName };
  }

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.FAMILY_ID,
      KEYS.CAREGIVER_ID,
      KEYS.CAREGIVER_NAME,
      KEYS.FAMILY_NAME,
      KEYS.BABY_NAME,
    ]);
  }

  async isAuthenticated(): Promise<boolean> {
    const auth = await this.getAuth();
    return auth !== null;
  }
}

export default new AuthService();
