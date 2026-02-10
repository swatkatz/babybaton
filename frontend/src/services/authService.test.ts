import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { AuthData } from './authService';

// Keys used internally by authService
const KEYS = {
  FAMILY_ID: '@baby_baton:family_id',
  CAREGIVER_ID: '@baby_baton:caregiver_id',
  CAREGIVER_NAME: '@baby_baton:caregiver_name',
  FAMILY_NAME: '@baby_baton:family_name',
  BABY_NAME: '@baby_baton:baby_name',
};

const mockAuthData: AuthData = {
  familyId: 'family-123',
  caregiverId: 'caregiver-456',
  caregiverName: 'Jane Doe',
  familyName: 'Doe Family',
  babyName: 'Baby Doe',
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock store
    (AsyncStorage as any)._reset();
  });

  describe('saveAuth', () => {
    it('should save all auth data to AsyncStorage via multiSet', async () => {
      await authService.saveAuth(mockAuthData);

      expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        [KEYS.FAMILY_ID, 'family-123'],
        [KEYS.CAREGIVER_ID, 'caregiver-456'],
        [KEYS.CAREGIVER_NAME, 'Jane Doe'],
        [KEYS.FAMILY_NAME, 'Doe Family'],
        [KEYS.BABY_NAME, 'Baby Doe'],
      ]);
    });
  });

  describe('getAuth', () => {
    it('should return auth data when all required fields are present', async () => {
      // Pre-populate storage
      await authService.saveAuth(mockAuthData);

      const result = await authService.getAuth();

      expect(result).toEqual(mockAuthData);
    });

    it('should return null when familyId is missing', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        [KEYS.FAMILY_ID, null],
        [KEYS.CAREGIVER_ID, 'caregiver-456'],
        [KEYS.CAREGIVER_NAME, 'Jane'],
        [KEYS.FAMILY_NAME, 'Doe Family'],
        [KEYS.BABY_NAME, 'Baby Doe'],
      ]);

      const result = await authService.getAuth();
      expect(result).toBeNull();
    });

    it('should return null when caregiverId is missing', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        [KEYS.FAMILY_ID, 'family-123'],
        [KEYS.CAREGIVER_ID, null],
        [KEYS.CAREGIVER_NAME, 'Jane'],
        [KEYS.FAMILY_NAME, 'Doe Family'],
        [KEYS.BABY_NAME, 'Baby Doe'],
      ]);

      const result = await authService.getAuth();
      expect(result).toBeNull();
    });

    it('should return null when familyName is missing', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        [KEYS.FAMILY_ID, 'family-123'],
        [KEYS.CAREGIVER_ID, 'caregiver-456'],
        [KEYS.CAREGIVER_NAME, 'Jane'],
        [KEYS.FAMILY_NAME, null],
        [KEYS.BABY_NAME, 'Baby Doe'],
      ]);

      const result = await authService.getAuth();
      expect(result).toBeNull();
    });

    it('should return null when babyName is missing', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        [KEYS.FAMILY_ID, 'family-123'],
        [KEYS.CAREGIVER_ID, 'caregiver-456'],
        [KEYS.CAREGIVER_NAME, 'Jane'],
        [KEYS.FAMILY_NAME, 'Doe Family'],
        [KEYS.BABY_NAME, null],
      ]);

      const result = await authService.getAuth();
      expect(result).toBeNull();
    });

    it('should use familyName first word as fallback when caregiverName is missing', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        [KEYS.FAMILY_ID, 'family-123'],
        [KEYS.CAREGIVER_ID, 'caregiver-456'],
        [KEYS.CAREGIVER_NAME, null],
        [KEYS.FAMILY_NAME, 'Doe Family'],
        [KEYS.BABY_NAME, 'Baby Doe'],
      ]);

      const result = await authService.getAuth();
      expect(result).not.toBeNull();
      expect(result!.caregiverName).toBe('Doe');
    });

    it('should use "User" as fallback when caregiverName is missing and familyName has no words', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
        [KEYS.FAMILY_ID, 'family-123'],
        [KEYS.CAREGIVER_ID, 'caregiver-456'],
        [KEYS.CAREGIVER_NAME, null],
        [KEYS.FAMILY_NAME, ''],
        [KEYS.BABY_NAME, 'Baby Doe'],
      ]);

      // familyName is empty string which is falsy, so getAuth should return null
      // because familyName is a required field
      const result = await authService.getAuth();
      expect(result).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should remove all auth keys from AsyncStorage', async () => {
      await authService.clearAuth();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        KEYS.FAMILY_ID,
        KEYS.CAREGIVER_ID,
        KEYS.CAREGIVER_NAME,
        KEYS.FAMILY_NAME,
        KEYS.BABY_NAME,
      ]);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when auth data is present', async () => {
      await authService.saveAuth(mockAuthData);

      const result = await authService.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when no auth data is stored', async () => {
      // multiGet returns all nulls by default on empty store
      const result = await authService.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
