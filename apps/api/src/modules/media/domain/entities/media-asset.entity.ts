import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum MediaAssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  /** Character Studio's talking-avatar clips - distinct from VIDEO so
   * Media Library, the gallery cap, and Recent Generations feeds can tell
   * a Character Studio output apart from a Video Studio one. Counts toward
   * MAX_GALLERY_MEDIA_PER_USER the same way IMAGE/VIDEO do (see
   * MediaAssetsService.countGalleryMedia). */
  CHARACTER = 'character',
}

export interface MediaAsset extends BaseTenantEntity {
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  type: MediaAssetType;
  /** The generation prompt (images) or spoken text/transcript (audio) - null
   * for plain uploaded files that were never AI-generated. */
  prompt: string | null;
  /** AI provider that generated this asset (e.g. "stability", "edge") - null
   * for plain uploads. */
  provider: string | null;
  model: string | null;
  /** Vendor voice id used, if this is a generated audio clip. */
  voiceId: string | null;
  /** Hash of the full generation request (type+provider+model+prompt+...) -
   * lets a repeat request with identical inputs be served from this row
   * instead of calling the provider again. Null for plain uploads. */
  cacheKeyHash: string | null;
}
