import type { Href } from 'expo-router';

/** Screens a notification can point at (the server sends these names as `metadata.link` / push `data.link`). */
const ROUTES: Record<string, Href> = {
  gallery: '/gallery',
  calendar: '/calendar',
  video: '/create/video',
  image: '/create/image',
  voice: '/create/voice',
  notifications: '/notifications',
};

export function routeForLink(link: unknown): Href | null {
  return typeof link === 'string' ? (ROUTES[link] ?? null) : null;
}
