import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API origin. Set EXPO_PUBLIC_API_URL in apps/mobile/.env (see .env.example).
 * On a physical phone "localhost" is the phone itself, so use your computer's
 * LAN address (e.g. http://192.168.1.20:3000) or the production URL.
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function devHostFallback(): string {
  // Browser preview: the API runs on the same machine that serves the page.
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `http://${window.location.hostname}:3000`;
  // Expo dev server host is the dev machine's LAN IP - reuse it for the API on port 3000.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const API_BASE_URL = fromEnv || devHostFallback();
export const API_PREFIX = '/api/v1';

/** The public website, for links that must always open the live pages (privacy policy, terms). */
export const WEBSITE = 'https://lumoraos.in';

/** The website (public files such as voice samples). Production serves both from one domain; in dev mode the API is
 * on port 3000 and the website on 3100 (deploy/local/dev.ps1). */
export const SITE_URL = API_BASE_URL.replace(/:3000$/, ':3100');
