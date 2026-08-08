import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum MediaAssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
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
