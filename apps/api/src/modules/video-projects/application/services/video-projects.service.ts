import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import {
  VideoProject,
  VideoProjectSource,
  VideoProjectStatus,
} from '../../domain/entities/video-project.entity';
import {
  IVideoProjectsRepository,
  VIDEO_PROJECTS_REPOSITORY,
} from '../../domain/repositories/video-project-repository.interface';
import { CreateVideoProjectDto } from '../dto/create-video-project.dto';
import { UpdateVideoProjectDto } from '../dto/update-video-project.dto';
import { VideoProjectCreatedEvent } from '../events/video-project-created.event';

@Injectable()
export class VideoProjectsService {
  constructor(
    @Inject(VIDEO_PROJECTS_REPOSITORY)
    private readonly videoProjectsRepository: IVideoProjectsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateVideoProjectDto, actorId?: string): Promise<VideoProject> {
    const project = await this.videoProjectsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        title: dto.title ?? 'Untitled video',
        source: dto.source ?? VideoProjectSource.SCENES,
        status: dto.status ?? VideoProjectStatus.DRAFT,
        scenes: dto.scenes ?? [],
        aspectRatio: dto.aspectRatio,
        transition: dto.transition,
        narrationText: dto.narrationText ?? null,
        narrationVoiceId: dto.narrationVoiceId ?? null,
        narrationGender: dto.narrationGender ?? null,
        narrationLanguage: dto.narrationLanguage ?? null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'video-projects.created',
      new VideoProjectCreatedEvent(project.id, project.workspaceId),
    );

    return project;
  }

  /** This user's own projects in the given workspace, most-recently-edited
   * first - the frontend derives both "Continue editing" (items[0], if it's
   * still a draft) and "Past projects" (the rest) from one call rather than
   * two bespoke endpoints for what's fundamentally one dataset. */
  async findMine(
    workspaceId: string,
    actorId: string,
    options: Pick<FindAllOptions, 'page' | 'limit'> = {},
  ): Promise<PaginatedResult<VideoProject>> {
    return this.videoProjectsRepository.findAll({
      ...options,
      sortBy: 'updatedAt',
      sortOrder: 'DESC',
      filters: { workspaceId, createdBy: actorId },
    });
  }

  async findById(id: string): Promise<VideoProject> {
    const project = await this.videoProjectsRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`VideoProject with id "${id}" not found`);
    }
    return project;
  }

  /** Ownership check independent of any permission grant - mirrors
   * NotificationsService.findOwned and VideoTemplatesService.remove's
   * `createdBy !== actorId` check. A project is inherently personal
   * (unlike video templates, which can be team-shared), so every mutating
   * action goes through this, not just delete. */
  async findOwned(id: string, actorId: string): Promise<VideoProject> {
    const project = await this.findById(id);
    if (project.createdBy !== actorId) {
      throw new ForbiddenException('You do not have access to this video project');
    }
    return project;
  }

  /** The auto-save target as someone works in the Scene Builder - accepts
   * a partial patch (title, scenes, narration settings, ...) on every
   * meaningful change rather than requiring the whole object each time. */
  async update(id: string, dto: UpdateVideoProjectDto, actorId: string): Promise<VideoProject> {
    await this.findOwned(id, actorId);
    return this.videoProjectsRepository.update(id, dto, actorId);
  }

  /** Marks a project ready and attaches the MediaAsset the composited
   * export was just saved as - a separate, explicit action from the
   * general update() so "finishing" can't happen as a side effect of an
   * auto-save PATCH racing with the export flow. */
  async finish(id: string, finalAssetId: string, actorId: string): Promise<VideoProject> {
    await this.findOwned(id, actorId);
    return this.videoProjectsRepository.update(
      id,
      { status: VideoProjectStatus.READY, finalAssetId },
      actorId,
    );
  }

  async remove(id: string, actorId: string): Promise<void> {
    await this.findOwned(id, actorId);
    await this.videoProjectsRepository.delete(id, actorId);
  }
}
