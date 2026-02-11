import Constants from 'expo-constants';

function getApiUrl(): string {
  // 1. Check EXPO_PUBLIC_API_URL env var (set at build time by EAS)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}/query`;
  }

  // 2. Check app.json extra config
  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) {
    return `${extraApiUrl}/query`;
  }

  // 3. Fall back to localhost for development
  return 'http://localhost:8080/query';
}

export const API_URL = getApiUrl();
