import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import {
  CreateMediaAssetData,
  IMediaAssetsRepository,
  UpdateMediaAssetData,
} from '../../domain/repositories/media-asset-repository.interface';
import { MediaAssetModel } from './media-asset.model';

@Injectable()
export class MediaAssetsRepository
  extends BaseRepository<MediaAssetModel, MediaAsset, CreateMediaAssetData, UpdateMediaAssetData>
  implements IMediaAssetsRepository
{
  constructor(@InjectModel(MediaAssetModel) model: typeof MediaAssetModel) {
    super(model);
  }

  protected toEntity(instance: MediaAssetModel): MediaAsset {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      fileName: plain.fileName,
      storageKey: plain.storageKey,
      url: plain.url,
      mimeType: plain.mimeType,
      sizeBytes: plain.sizeBytes,
      type: plain.type,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
