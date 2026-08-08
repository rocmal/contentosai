import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { MediaAsset, MediaAssetType } from '../entities/media-asset.entity';

export interface CreateMediaAssetData {
  organizationId: string;
  workspaceId: string;
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  type: MediaAssetType;
  prompt?: string | null;
  provider?: string | null;
  model?: string | null;
  voiceId?: string | null;
  cacheKeyHash?: string | null;
}

export type UpdateMediaAssetData = Partial<
  Omit<CreateMediaAssetData, 'organizationId' | 'workspaceId'>
>;

export const MEDIA_ASSETS_REPOSITORY = Symbol('MEDIA_ASSETS_REPOSITORY');

export type IMediaAssetsRepository = IBaseRepository<
  MediaAsset,
  CreateMediaAssetData,
  UpdateMediaAssetData
>;
