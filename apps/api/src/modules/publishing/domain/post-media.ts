/** The social accounts Lumora can post to. */
export const SOCIAL_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'youtube'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** What a post carries besides its text. */
export type PostMediaKind = 'none' | 'image' | 'video';

/**
 * What each platform's publisher can post today. LinkedIn takes text on its own, an image or a video; the others
 * only take a video so far (their image posts are the next step). The website composer mirrors this table
 * (src/lib/socialPosts.ts) - change both together.
 */
export const PLATFORM_MEDIA_SUPPORT: Record<SocialPlatform, readonly PostMediaKind[]> = {
  linkedin: ['none', 'image', 'video'],
  facebook: ['video'],
  instagram: ['video'],
  youtube: ['video'],
};

/** Longest post text each platform accepts. */
export const PLATFORM_TEXT_LIMIT: Record<SocialPlatform, number> = {
  linkedin: 3000,
  facebook: 5000,
  instagram: 2200,
  youtube: 5000,
};

/** Who can watch a YouTube video. */
export const VIDEO_VISIBILITIES = ['public', 'unlisted', 'private'] as const;
export type VideoVisibility = (typeof VIDEO_VISIBILITIES)[number];

/** YouTube's longest video title. */
export const YOUTUBE_TITLE_LIMIT = 100;

/** YouTube refuses "<" and ">" in titles and descriptions. */
export function youtubeSafeText(text: string): string {
  return text.replace(/[<>]/g, '');
}

export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};
