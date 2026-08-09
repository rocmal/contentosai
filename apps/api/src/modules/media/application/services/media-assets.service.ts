import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

/** 409 Conflict - the user already has MAX_GALLERY_MEDIA_PER_USER images/
 * videos. Thrown before the asset is persisted, same "check-then-throw"
 * shape as credits.service.ts's InsufficientCreditsException. */
export class GalleryLimitExceededException extends HttpException {
  constructor(max: number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `You've reached the ${max} image/video limit. Delete something from your gallery to make room.`,
        error: 'Gallery Limit Exceeded',
      },
      HttpStatus.CONFLICT,
    );
  }
}

/** Applies to images + videos combined, not audio/documents - storage abuse
 * is a visual-media-size concern, and this is the single choke point every
 * image/video creation path already calls (Image Studio, Video Studio's
 * AI-generate, Character Studio, and the gallery upload endpoint), so
 * enforcing it here covers all of them at once. */
export const MAX_GALLERY_MEDIA_PER_USER = 100;

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

  /** This user's total image+video count, regardless of workspace - used to
   * enforce MAX_GALLERY_MEDIA_PER_USER. Two equality-filtered counts rather
   * than one Op.in filter, matching the scalar-filter shape already used
   * elsewhere in this codebase (e.g. findOne({workspaceId, provider,
   * status})) instead of relying on a Sequelize operator-object filter. */
  async countGalleryMedia(userId: string): Promise<number> {
    const [images, videos] = await Promise.all([
      this.mediaAssetsRepository.count({ createdBy: userId, type: MediaAssetType.IMAGE }),
      this.mediaAssetsRepository.count({ createdBy: userId, type: MediaAssetType.VIDEO }),
    ]);
    return images + videos;
  }

  /** Persists a freshly-generated (already uploaded to storage) image/audio
   * result into the gallery, doubling as this user's generation cache.
   * Enforces MAX_GALLERY_MEDIA_PER_USER for image/video types only - the
   * single choke point every image/video creation path already calls. */
  async saveGenerated(data: CreateMediaAssetData, actorId?: string): Promise<MediaAsset> {
    if (actorId && (data.type === MediaAssetType.IMAGE || data.type === MediaAssetType.VIDEO)) {
      const count = await this.countGalleryMedia(actorId);
      if (count >= MAX_GALLERY_MEDIA_PER_USER) {
        throw new GalleryLimitExceededException(MAX_GALLERY_MEDIA_PER_USER);
      }
    }

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
