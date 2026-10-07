import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { MediaAsset, MediaAssetType } from '../../domain/entities/media-asset.entity';
import {
  CreateMediaAssetData,
  IMediaAssetsRepository,
  MediaLibraryQuery,
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

/** Applies to images + videos + character clips combined, not audio/
 * documents - storage abuse is a visual-media-size concern, and this is
 * the single choke point every image/video/character creation path
 * already calls (Image Studio, Video Studio's AI-generate, Character
 * Studio, and the gallery upload endpoint), so enforcing it here covers
 * all of them at once. */
export const MAX_GALLERY_MEDIA_PER_USER = 100;

/** Who is asking - taken from the signed-in user, never from the request body. */
export interface MediaActor {
  id: string;
  workspaceId: string | null;
  roles: string[];
}

/** A library card: the asset, who made it, and whether the viewer may rename/delete it. */
export type MediaLibraryItem = MediaAsset & { createdByName: string | null; canManage: boolean };

export interface ListLibraryOptions {
  scope?: 'mine' | 'team';
  type?: MediaAssetType;
  search?: string;
  generatedOnly?: boolean;
  page?: number;
  limit?: number;
}

/** Workspace admins can tidy up their team's gallery; everyone else only their own items. */
const MANAGER_ROLES = ['super-admin', 'admin'];

const MAX_NAME_LENGTH = 120;

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

  /** This user's total image+video+character count, regardless of
   * workspace - used to enforce MAX_GALLERY_MEDIA_PER_USER. Three
   * equality-filtered counts rather than one Op.in filter, matching the
   * scalar-filter shape already used elsewhere in this codebase (e.g.
   * findOne({workspaceId, provider, status})) instead of relying on a
   * Sequelize operator-object filter. */
  async countGalleryMedia(userId: string): Promise<number> {
    const [images, videos, characters] = await Promise.all([
      this.mediaAssetsRepository.count({ createdBy: userId, type: MediaAssetType.IMAGE }),
      this.mediaAssetsRepository.count({ createdBy: userId, type: MediaAssetType.VIDEO }),
      this.mediaAssetsRepository.count({ createdBy: userId, type: MediaAssetType.CHARACTER }),
    ]);
    return images + videos + characters;
  }

  /** Persists a freshly-generated (already uploaded to storage) image/audio/
   * character result into the gallery, doubling as this user's generation
   * cache. Enforces MAX_GALLERY_MEDIA_PER_USER for image/video/character
   * types only - the single choke point every one of those creation paths
   * already calls. */
  async saveGenerated(data: CreateMediaAssetData, actorId?: string): Promise<MediaAsset> {
    if (
      actorId &&
      (data.type === MediaAssetType.IMAGE ||
        data.type === MediaAssetType.VIDEO ||
        data.type === MediaAssetType.CHARACTER)
    ) {
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

  /** One asset, but only if it belongs to the viewer's workspace - otherwise it looks like it doesn't exist. */
  async findForActor(id: string, actor: MediaActor): Promise<MediaAsset> {
    const mediaAsset = await this.findById(id);
    if (!actor.workspaceId || mediaAsset.workspaceId !== actor.workspaceId) {
      throw new NotFoundException(`MediaAsset with id "${id}" not found`);
    }
    return mediaAsset;
  }

  private canManage(mediaAsset: MediaAsset, actor: MediaActor): boolean {
    if (!actor.workspaceId || mediaAsset.workspaceId !== actor.workspaceId) return false;
    return (
      mediaAsset.createdBy === actor.id || actor.roles.some((role) => MANAGER_ROLES.includes(role))
    );
  }

  private async findManageable(id: string, actor: MediaActor): Promise<MediaAsset> {
    const mediaAsset = await this.findById(id);
    if (!this.canManage(mediaAsset, actor)) {
      // Same answer as a missing item, so ids can't be probed across workspaces.
      throw new NotFoundException(`MediaAsset with id "${id}" not found`);
    }
    return mediaAsset;
  }

  /** The gallery: your own items or the whole team's, newest first, with who made each one. */
  async listLibrary(
    actor: MediaActor,
    options: ListLibraryOptions = {},
  ): Promise<PaginatedResult<MediaLibraryItem>> {
    if (!actor.workspaceId) {
      return {
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 24, totalPages: 1, currentPage: 1 },
      };
    }
    const query: MediaLibraryQuery = {
      workspaceId: actor.workspaceId,
      createdBy: options.scope === 'team' ? undefined : actor.id,
      type: options.type,
      search: options.search,
      generatedOnly: options.generatedOnly,
      page: options.page,
      limit: options.limit,
    };
    const result = await this.mediaAssetsRepository.searchLibrary(query);
    const names = await this.mediaAssetsRepository.findCreatorNames(
      result.items.map((item) => item.createdBy).filter((id): id is string => Boolean(id)),
    );
    return {
      items: result.items.map((item) => ({
        ...item,
        createdByName: item.createdBy ? (names.get(item.createdBy) ?? null) : null,
        canManage: this.canManage(item, actor),
      })),
      meta: result.meta,
    };
  }

  /** Renames an item. A name without a file extension keeps the original one, so downloads still open. */
  async rename(id: string, rawName: string, actor: MediaActor): Promise<MediaAsset> {
    const mediaAsset = await this.findManageable(id, actor);
    // No path characters or control codes - the name ends up in downloads.
    // eslint-disable-next-line no-control-regex
    const cleaned = rawName
      .replace(/[\\/\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) {
      throw new BadRequestException('Give it a name.');
    }
    const extension = /\.[a-z0-9]{1,5}$/i.exec(mediaAsset.fileName)?.[0] ?? '';
    const hasExtension = /\.[a-z0-9]{1,5}$/i.test(cleaned);
    const fileName = hasExtension || !extension ? cleaned : `${cleaned}${extension}`;
    if (fileName.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(`Keep the name under ${MAX_NAME_LENGTH} characters.`);
    }
    return this.mediaAssetsRepository.update(id, { fileName }, actor.id);
  }

  /** Fills in what an item was made from, if nothing was recorded when it was saved. Never overwrites. */
  async setPromptIfMissing(id: string, prompt: string): Promise<void> {
    const mediaAsset = await this.mediaAssetsRepository.findById(id);
    if (mediaAsset && !mediaAsset.prompt) {
      await this.mediaAssetsRepository.update(id, { prompt });
    }
  }

  /** Only the name and prompt can be edited here - the stored file and its address never change. */
  async update(id: string, dto: UpdateMediaAssetDto, actor: MediaActor): Promise<MediaAsset> {
    await this.findManageable(id, actor);
    return this.mediaAssetsRepository.update(
      id,
      { fileName: dto.fileName, prompt: dto.prompt },
      actor.id,
    );
  }

  async remove(id: string, actor: MediaActor): Promise<void> {
    await this.findManageable(id, actor);
    await this.mediaAssetsRepository.delete(id, actor.id);
  }
}
