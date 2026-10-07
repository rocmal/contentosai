import Constants from 'expo-constants';

/**
 * API origin. Set EXPO_PUBLIC_API_URL in apps/mobile/.env (see .env.example).
 * On a physical phone "localhost" is the phone itself, so use your computer's
 * LAN address (e.g. http://192.168.1.20:3000) or the production URL.
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function devHostFallback(): string {
  // Expo dev server host is the dev machine's LAN IP - reuse it for the API on port 3000.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const API_BASE_URL = fromEnv || devHostFallback();
export const API_PREFIX = '/api/v1';
