import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import {
  IMediaAssetsRepository,
  MEDIA_ASSETS_REPOSITORY,
} from '../../domain/repositories/media-asset-repository.interface';
import { CreateMediaAssetDto } from '../dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from '../dto/update-media-asset.dto';
import { MediaAssetCreatedEvent } from '../events/media-asset-created.event';

@Injectable()
export class MediaAssetsService {
  constructor(
    @Inject(MEDIA_ASSETS_REPOSITORY) private readonly mediaAssetsRepository: IMediaAssetsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateMediaAssetDto, actorId?: string): Promise<MediaAsset> {
    const mediaAsset = await this.mediaAssetsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        fileName: dto.fileName,
        storageKey: dto.storageKey,
        url: dto.url,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        type: dto.type,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'media.created',
      new MediaAssetCreatedEvent(mediaAsset.id, mediaAsset.workspaceId),
    );

    return mediaAsset;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<MediaAsset>> {
    return this.mediaAssetsRepository.findAll(options);
  }

  async findById(id: string): Promise<MediaAsset> {
    const mediaAsset = await this.mediaAssetsRepository.findById(id);
    if (!mediaAsset) {
      throw new NotFoundException(`MediaAsset with id "${id}" not found`);
    }
    return mediaAsset;
  }

  async update(id: string, dto: UpdateMediaAssetDto, actorId?: string): Promise<MediaAsset> {
    await this.findById(id);
    return this.mediaAssetsRepository.update(
      id,
      {
        fileName: dto.fileName,
        storageKey: dto.storageKey,
        url: dto.url,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        type: dto.type,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.mediaAssetsRepository.delete(id, actorId);
  }
}
