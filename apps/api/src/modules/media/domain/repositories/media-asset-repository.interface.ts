import { IBaseRepository, PaginatedResult } from '@shared/interfaces/base-repository.interface';
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

export interface MediaLibraryQuery {
  workspaceId: string;
  /** Only this person's items; leave out to include the whole workspace (team gallery). */
  createdBy?: string;
  type?: MediaAssetType;
  /** Matches the file name or the prompt/text it was made from. */
  search?: string;
  /** Only items an AI studio generated (not plain uploads). */
  generatedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface IMediaAssetsRepository extends IBaseRepository<
  MediaAsset,
  CreateMediaAssetData,
  UpdateMediaAssetData
> {
  searchLibrary(query: MediaLibraryQuery): Promise<PaginatedResult<MediaAsset>>;
  /** Display names ("First Last") for the given users, keyed by user id. */
  findCreatorNames(userIds: string[]): Promise<Map<string, string>>;
}
