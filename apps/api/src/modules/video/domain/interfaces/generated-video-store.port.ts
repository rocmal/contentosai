import { VideoPayload } from './conversational-video.port';

export interface StoredVideo {
  readonly storageKey: string;
  readonly url: string;
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly fileName: string;
}

export interface StoreVideoContext {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly sessionId: string;
  readonly turnId: string;
}

/**
 * Vendor video URLs expire, and inline payloads only exist in the response
 * body. Either way the bytes have to land in our own storage before the asset
 * is durable, so the application layer depends on this port rather than on a
 * concrete storage backend.
 */
export interface IGeneratedVideoStore {
  persist(payload: VideoPayload, context: StoreVideoContext): Promise<StoredVideo>;
}

export const GENERATED_VIDEO_STORE = Symbol('GENERATED_VIDEO_STORE');
