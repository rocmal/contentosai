/**
 * Lumora API client for the mobile app. Mirrors the web client (src/lib/api.ts):
 * bearer auth, one silent refresh on 401, and the { success, data } envelope.
 * Tokens live in the OS keychain/keystore via expo-secure-store.
 */
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_PREFIX } from './config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  organizationId: string | null;
  workspaceId: string | null;
  permissions?: string[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
  message?: string | string[];
}

const TOKEN_KEY = 'lumora.tokens';
let tokens: TokenPair | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn;
}

export async function loadTokens(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    tokens = raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    tokens = null;
  }
  return !!tokens;
}

async function saveTokens(next: TokenPair | null): Promise<void> {
  tokens = next;
  if (next) await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(next));
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

function errorMessage(body: unknown, fallback: string): string {
  const m = (body as { message?: string | string[] } | null)?.message;
  return Array.isArray(m) ? m.join(', ') : m || fallback;
}

async function parse<T>(res: Response): Promise<T> {
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.statusText || `Request failed (${res.status})`));
  if (res.status === 204 || body === null) return undefined as T;
  const env = body as Envelope<T>;
  // Paginated results arrive with meta hoisted next to a bare array.
  if (env.meta !== undefined && Array.isArray(env.data)) return { items: env.data, meta: env.meta } as T;
  return env.data;
}

let refreshing: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      if (!tokens?.refreshToken) return false;
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        const data = await parse<TokenPair>(res);
        await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return true;
      } catch {
        await saveTokens(null);
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Authenticated fetch that retries once through a silent refresh. */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const run = () => {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
    if (tokens) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    return fetch(`${API_BASE_URL}${API_PREFIX}${path}`, { ...init, headers });
  };
  let res = await run();
  if (res.status === 401 && tokens) {
    if (await refresh()) res = await run();
    else {
      onSessionExpired?.();
    }
  }
  return res;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return parse<T>(await authedFetch(path, init));
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const getCurrentUser = () => request<AuthUser>('/users/me');

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parse<TokenPair>(res);
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return getCurrentUser();
}

export async function logout(): Promise<void> {
  const refreshToken = tokens?.refreshToken;
  try {
    if (refreshToken) {
      await authedFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    }
  } catch {
    // Signing out locally matters more than telling the server.
  }
  await saveTokens(null);
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface CreditWallet {
  /** null = unlimited (Enterprise plan). */
  balance: number | null;
}

export interface CreditRates {
  voice: { perMinute: Record<string, number>; wordsPerMinute: number };
  video: { per10Seconds: Record<string, number> };
}

export const getCreditWallet = () => request<CreditWallet>('/credits/wallet');
export const getCreditRates = () => request<CreditRates>('/credits/rates');

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export type ImageProvider = 'openai' | 'stability' | 'flux';
export type ImageAspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '2:3';
export type ImageQuality = 'draft' | 'standard' | 'high';

export interface ImageProviderOption {
  id: ImageProvider;
  label: string;
  note: string;
  configured: boolean;
  recommended: boolean;
  qualities: { id: ImageQuality; label: string; credits: number }[];
}

export interface ImageResult {
  provider: string;
  model: string;
  status: 'completed' | 'processing';
  images: string[];
  creditsUsed?: number;
}

export const getImageOptions = () => request<{ providers: ImageProviderOption[] }>('/image/options');

export const generateImage = (input: {
  prompt: string;
  provider: ImageProvider;
  aspectRatio: ImageAspectRatio;
  quality: ImageQuality;
  count?: number;
}) => request<ImageResult>('/image/generate', { method: 'POST', body: JSON.stringify(input) });

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export type VideoProvider = 'veo' | 'runway' | 'kling' | 'pika' | 'luma' | 'mock';
export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoResult {
  provider: string;
  model: string;
  jobId: string;
  status: VideoJobStatus;
  videoUrl?: string;
  cacheKey?: string;
  cached?: boolean;
}

export const generateVideo = (input: {
  prompt: string;
  provider: VideoProvider;
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16';
}) => request<VideoResult>('/video/generate', { method: 'POST', body: JSON.stringify(input) });

export const getVideoJob = (provider: string, jobId: string, cacheKey?: string) =>
  request<VideoResult>(
    `/video/jobs/${encodeURIComponent(jobId)}?provider=${encodeURIComponent(provider)}${
      cacheKey ? `&cacheKey=${encodeURIComponent(cacheKey)}` : ''
    }`,
  );

/** Polls until the job completes or fails. Pass an AbortSignal so leaving the screen stops it. */
export async function pollVideoJob(
  first: VideoResult,
  opts: { signal?: AbortSignal; onUpdate?: (r: VideoResult) => void; timeoutMs?: number } = {},
): Promise<VideoResult> {
  const started = Date.now();
  let current = first;
  while (current.status !== 'completed' && current.status !== 'failed') {
    if (opts.signal?.aborted) throw new ApiError(0, 'Cancelled');
    if (Date.now() - started > (opts.timeoutMs ?? 300_000)) {
      throw new ApiError(408, 'The video is taking longer than expected. Check Gallery in a few minutes.');
    }
    await new Promise((r) => setTimeout(r, 3000));
    current = await getVideoJob(first.provider, first.jobId, first.cacheKey);
    opts.onUpdate?.(current);
  }
  return current;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export type VoiceProvider = 'edge' | 'elevenlabs' | 'cartesia' | 'azure' | 'piper' | 'sarvam';

export interface VoiceInfo {
  id: string;
  name: string;
  locale?: string;
  gender?: string;
}

export const listVoices = (provider: VoiceProvider) =>
  request<{ voices: VoiceInfo[] }>(`/voice/voices?provider=${provider}`).then((r) => r.voices);

/** POST /voice/generate answers with raw audio bytes, not the JSON envelope. */
export async function generateSpeech(input: {
  text: string;
  provider: VoiceProvider;
  voiceId?: string;
  languageCode?: string;
}): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const res = await authedFetch('/voice/generate', { method: 'POST', body: JSON.stringify(input) });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorMessage(body, `Voice generation failed (${res.status})`));
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), mimeType: res.headers.get('content-type') ?? 'audio/mpeg' };
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export type MediaAssetType = 'image' | 'video' | 'audio' | 'document' | 'character';

export interface MediaAsset {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  type: MediaAssetType;
  prompt: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  meta: { totalItems: number; totalPages: number; currentPage: number };
}

export const listMyGallery = (input: { type?: MediaAssetType; page?: number; limit?: number } = {}) => {
  const p = new URLSearchParams({ page: String(input.page ?? 1), limit: String(input.limit ?? 20) });
  if (input.type) p.set('type', input.type);
  return request<Page<MediaAsset>>(`/media/my?${p.toString()}`);
};
