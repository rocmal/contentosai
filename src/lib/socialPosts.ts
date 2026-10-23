import { useEffect, useState } from 'react';
import { apiRequest, PublishingJob, SocialPlatform } from './api';

/** What a post carries besides its text. */
export type PostMediaKind = 'none' | 'image' | 'video';

/** Who can watch a YouTube video (mirrors VIDEO_VISIBILITIES in apps/api/.../publishing/domain/post-media.ts). */
export type VideoVisibility = 'public' | 'unlisted' | 'private';

/** YouTube's longest title, and its description limit in bytes (Hindi and Punjabi letters take 3 bytes each). */
export const YOUTUBE_TITLE_LIMIT = 100;
export const YOUTUBE_DESCRIPTION_BYTES = 5000;

/**
 * What each platform can post from Lumora today. Mirrors PLATFORM_MEDIA_SUPPORT / PLATFORM_TEXT_LIMIT in
 * apps/api/src/modules/publishing/domain/post-media.ts - change both together.
 */
export const PLATFORM_MEDIA_SUPPORT: Record<SocialPlatform, readonly PostMediaKind[]> = {
  linkedin: ['none', 'image', 'video'],
  facebook: ['video'],
  instagram: ['video'],
  youtube: ['video'],
};

export const PLATFORM_TEXT_LIMIT: Record<SocialPlatform, number> = {
  linkedin: 3000,
  facebook: 5000,
  instagram: 2200,
  youtube: 5000,
};

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

const POST_CREATED_EVENT = 'lumora:post-created';

/** Post now (no scheduledAt) or at a time, to one or more connected accounts. Screens listening with
 * useOnPostCreated (the Calendar) refresh afterwards. */
export async function createSocialPost(input: {
  text: string;
  mediaAssetId?: string;
  platforms: SocialPlatform[];
  scheduledAt?: string;
  /** YouTube's video title (required there). */
  title?: string;
  /** YouTube only. */
  visibility?: VideoVisibility;
}): Promise<{ contentId: string; jobs: PublishingJob[] }> {
  const created = await apiRequest<{ contentId: string; jobs: PublishingJob[] }>('/publishing/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event(POST_CREATED_EVENT));
  return created;
}

/** Runs `onCreated` whenever the composer creates a post (pass a stable function). */
export function useOnPostCreated(onCreated: () => void): void {
  useEffect(() => {
    window.addEventListener(POST_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(POST_CREATED_EVENT, onCreated);
  }, [onCreated]);
}

/** A Gallery item to attach. */
export interface ComposerMedia {
  assetId: string;
  type: 'image' | 'video';
  url: string;
  name?: string;
}

export interface ComposerRequest {
  text?: string;
  media?: ComposerMedia;
  /** What the picture or video was made from - "Write with AI" uses it as the topic. */
  topic?: string;
}

const OPEN_EVENT = 'lumora:compose-post';

/** Opens the post composer (rendered once by App) from any screen. */
export function openPostComposer(request: ComposerRequest = {}): void {
  window.dispatchEvent(new CustomEvent<ComposerRequest>(OPEN_EVENT, { detail: request }));
}

/** For the composer host: the open request (with a key that changes on every open, so the composer starts fresh),
 * and a way to close it. */
export function usePostComposerRequest(): { request: ComposerRequest | null; key: number; close: () => void } {
  const [state, setState] = useState<{ request: ComposerRequest | null; key: number }>({ request: null, key: 0 });
  useEffect(() => {
    const onOpen = (event: Event) =>
      setState((previous) => ({ request: (event as CustomEvent<ComposerRequest>).detail ?? {}, key: previous.key + 1 }));
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  return { ...state, close: () => setState((previous) => ({ ...previous, request: null })) };
}

/** A YouTube upload: one Gallery video, and optionally a title and description to start from. */
export interface YouTubeUploadRequest {
  media?: ComposerMedia;
  title?: string;
  description?: string;
  /** What the video was made from - "Write with AI" uses it. */
  topic?: string;
}

const YOUTUBE_OPEN_EVENT = 'lumora:youtube-upload';

/** Opens the YouTube upload window (rendered once by App) from any screen. */
export function openYouTubeUpload(request: YouTubeUploadRequest = {}): void {
  window.dispatchEvent(new CustomEvent<YouTubeUploadRequest>(YOUTUBE_OPEN_EVENT, { detail: request }));
}

/** For the upload window's host: the open request (with a key that changes on every open) and a way to close it. */
export function useYouTubeUploadRequest(): { request: YouTubeUploadRequest | null; key: number; close: () => void } {
  const [state, setState] = useState<{ request: YouTubeUploadRequest | null; key: number }>({ request: null, key: 0 });
  useEffect(() => {
    const onOpen = (event: Event) =>
      setState((previous) => ({
        request: (event as CustomEvent<YouTubeUploadRequest>).detail ?? {},
        key: previous.key + 1,
      }));
    window.addEventListener(YOUTUBE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(YOUTUBE_OPEN_EVENT, onOpen);
  }, []);
  return { ...state, close: () => setState((previous) => ({ ...previous, request: null })) };
}
