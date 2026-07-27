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
}
