/** Calendar and publishing. Publishing posts video only, so only Gallery videos can be scheduled. */
import { ApiError, request, type AuthUser } from './api';

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'youtube';
export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
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
  metadata: { videoUrl?: string; caption?: string } | null;
}

/** Which social accounts are connected. Connecting happens on the website. */
export const getSocialConnections = () =>
  request<Record<SocialPlatform, { connected: boolean }>>('/integrations/meta/status');

export const listPublishingJobs = () =>
  request<{ items: PublishingJob[] }>('/publishing/jobs?limit=50').then((r) => r.items);

export const listContent = () => request<{ items: ContentItem[] }>('/content?limit=50').then((r) => r.items);

export const cancelPublishingJob = (id: string) =>
  request<{ deleted: boolean }>(`/publishing/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** Schedules a video already in the Gallery. Its URL is public, so nothing is uploaded again. */
export async function scheduleGalleryVideo(input: {
  user: AuthUser;
  videoUrl: string;
  caption: string;
  platform: SocialPlatform;
  scheduledAt: Date;
}): Promise<PublishingJob> {
  const { user } = input;
  if (!user.organizationId || !user.workspaceId) {
    throw new ApiError(400, 'Your account is not attached to a workspace yet.');
  }
  const content = await request<{ id: string }>('/content', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      title: input.caption.slice(0, 100) || 'Lumora video',
      body: input.caption,
      type: 'video',
      aiGenerated: true,
      metadata: { videoUrl: input.videoUrl, caption: input.caption },
    }),
  });
  return request<PublishingJob>('/publishing/jobs', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      contentId: content.id,
      platform: input.platform,
      scheduledAt: input.scheduledAt.toISOString(),
    }),
  });
}
