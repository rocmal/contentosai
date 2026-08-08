import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { MediaAsset, MediaAssetType } from '../../domain/entities/media-asset.entity';
import {
  CreateMediaAssetData,
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
        prompt: dto.prompt ?? null,
        provider: dto.provider ?? null,
        model: dto.model ?? null,
        voiceId: dto.voiceId ?? null,
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

  /** The current user's own reusable gallery - generated images/audio (and
   * any plain uploads), optionally narrowed to one type. */
  async findMyGallery(
    userId: string,
    type: MediaAssetType | undefined,
    options: { page?: number; limit?: number },
  ): Promise<PaginatedResult<MediaAsset>> {
    return this.mediaAssetsRepository.findAll({
      page: options.page,
      limit: options.limit,
      filters: { createdBy: userId, ...(type ? { type } : {}) },
    });
  }

  /** Looks up a prior generation with an identical request signature for
   * this user - a hit means the caller can skip the AI provider entirely. */
  async findCached(userId: string, cacheKeyHash: string): Promise<MediaAsset | null> {
    return this.mediaAssetsRepository.findOne({ createdBy: userId, cacheKeyHash });
  }

  /** Persists a freshly-generated (already uploaded to storage) image/audio
   * result into the gallery, doubling as this user's generation cache. */
  async saveGenerated(data: CreateMediaAssetData, actorId?: string): Promise<MediaAsset> {
    const mediaAsset = await this.mediaAssetsRepository.create(data, actorId);
    this.eventEmitter.emit(
      'media.created',
      new MediaAssetCreatedEvent(mediaAsset.id, mediaAsset.workspaceId),
    );
    return mediaAsset;
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
        prompt: dto.prompt,
        provider: dto.provider,
        model: dto.model,
        voiceId: dto.voiceId,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.mediaAssetsRepository.delete(id, actorId);
  }
}
