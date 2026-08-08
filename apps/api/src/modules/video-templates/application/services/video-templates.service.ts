import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  VideoTemplate,
  VideoTemplateVisibility,
} from '../../domain/entities/video-template.entity';
import {
  IVideoTemplatesRepository,
  VIDEO_TEMPLATES_REPOSITORY,
} from '../../domain/repositories/video-template-repository.interface';
import { CreateVideoTemplateDto } from '../dto/create-video-template.dto';
import { VideoTemplateCreatedEvent } from '../events/video-template-created.event';

@Injectable()
export class VideoTemplatesService {
  constructor(
    @Inject(VIDEO_TEMPLATES_REPOSITORY)
    private readonly videoTemplatesRepository: IVideoTemplatesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateVideoTemplateDto, actorId?: string): Promise<VideoTemplate> {
    const videoTemplate = await this.videoTemplatesRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        title: dto.title,
        videoUrl: dto.videoUrl,
        storageKey: dto.storageKey,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        aspectRatio: dto.aspectRatio,
        durationSeconds: dto.durationSeconds ?? null,
        visibility: dto.visibility,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'video-templates.created',
      new VideoTemplateCreatedEvent(videoTemplate.id, videoTemplate.workspaceId),
    );

    return videoTemplate;
  }

  /** Templates this user can pick from: every "team" template in their
   * workspace, plus their own "private" ones - bounded to a generous page
   * size since this is a picker list, not a paginated table. */
  async findAvailableForUser(workspaceId: string, userId: string): Promise<VideoTemplate[]> {
    const result = await this.videoTemplatesRepository.findAll({
      limit: 200,
      filters: { workspaceId },
    });
    return result.items.filter(
      (template) =>
        template.visibility === VideoTemplateVisibility.TEAM || template.createdBy === userId,
    );
  }

  async findById(id: string): Promise<VideoTemplate> {
    const videoTemplate = await this.videoTemplatesRepository.findById(id);
    if (!videoTemplate) {
      throw new NotFoundException(`VideoTemplate with id "${id}" not found`);
    }
    return videoTemplate;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const videoTemplate = await this.findById(id);
    if (videoTemplate.createdBy !== actorId) {
      throw new ForbiddenException('Only the creator can delete this template');
    }
    await this.videoTemplatesRepository.delete(id, actorId);
  }
}
