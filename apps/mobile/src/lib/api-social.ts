/** Calendar and publishing: a post is text plus, optionally, one Gallery image or video (see PLATFORM_MEDIA_SUPPORT). */
import { request } from './api';

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'youtube';
export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

/** What a post carries besides its text. */
export type PostMediaKind = 'none' | 'image' | 'video';

/**
 * What each account can post from Lumora. Mirrors apps/api/src/modules/publishing/domain/post-media.ts (and the
 * website's src/lib/socialPosts.ts) - change all three together.
 */
export const PLATFORM_MEDIA_SUPPORT: Record<SocialPlatform, readonly PostMediaKind[]> = {
  linkedin: ['none', 'image', 'video'],
  facebook: ['video'],
  instagram: ['video'],
  youtube: ['video'],
};

export interface PublishingJob {
  id: string;
  contentId: string | null;
  platform: string;
  status: 'scheduled' | 'published' | 'failed';
  scheduledAt: string | null;
  publishedAt: string | null;
  permalink: string | null;
}

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  metadata: { videoUrl?: string; imageUrl?: string; caption?: string } | null;
}

export interface SocialConnection {
  connected: boolean;
  label?: string;
  /** LinkedIn sign-ins last 60 days: when this one stops working (ISO), and whether it already has. */
  expiresAt?: string;
  expired?: boolean;
}

/** Which social accounts are connected. Connecting happens on the website. */
export const getSocialConnections = () =>
  request<Record<SocialPlatform, SocialConnection>>('/integrations/meta/status');

export const listPublishingJobs = () =>
  request<{ items: PublishingJob[] }>('/publishing/jobs?limit=50').then((r) => r.items);

export const listContent = () => request<{ items: ContentItem[] }>('/content?limit=50').then((r) => r.items);

export const cancelPublishingJob = (id: string) =>
  request<{ deleted: boolean }>(`/publishing/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** Posts now (no scheduledAt) or at a time. The server checks every account again and saves the post to the Calendar. */
export const createSocialPost = (input: {
  text: string;
  mediaAssetId?: string;
  platforms: SocialPlatform[];
  scheduledAt?: string;
}) =>
  request<{ contentId: string; jobs: PublishingJob[] }>('/publishing/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
