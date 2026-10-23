export interface SocialPublishRequest {
  videoUrl?: string;
  /** A Gallery image to post (LinkedIn only for now - see PLATFORM_MEDIA_SUPPORT). */
  imageUrl?: string;
  text?: string;
  caption: string;
  /** The post's title (YouTube's video title). */
  title?: string;
  /** YouTube: who can watch the video. */
  visibility?: 'public' | 'unlisted' | 'private';
  /** Made by an AI engine - YouTube labels it as altered or synthetic content. */
  aiGenerated?: boolean;
  /** Decrypted integration credentials for this workspace+platform - each
   * provider destructures the fields it needs (e.g. Facebook/Instagram read
   * pageAccessToken/pageId/igUserId, LinkedIn reads accessToken/authorUrn). */
  credentials: Record<string, unknown>;
}

export interface SocialPublishResult {
  externalPostId: string;
  permalink?: string;
}

/** Port every social platform publisher (Facebook, Instagram, LinkedIn,
 * YouTube, ...) implements. Each provider is responsible for validating that
 * the request contains what it needs (e.g. a video-only platform throws if
 * videoUrl is missing) - the processor calling publish() stays agnostic. */
export interface ISocialPublisher {
  readonly name: string;
  publish(request: SocialPublishRequest): Promise<SocialPublishResult>;
}
