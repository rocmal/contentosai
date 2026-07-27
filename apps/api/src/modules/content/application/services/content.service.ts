import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Content } from '../../domain/entities/content.entity';
import {
  CONTENT_REPOSITORY,
  IContentRepository,
} from '../../domain/repositories/content-repository.interface';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { ContentCreatedEvent } from '../events/content-created.event';

@Injectable()
export class ContentService {
  constructor(
    @Inject(CONTENT_REPOSITORY) private readonly contentRepository: IContentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateContentDto, actorId?: string): Promise<Content> {
    const content = await this.contentRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        campaignId: dto.campaignId ?? null,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        aiGenerated: dto.aiGenerated ?? false,
        aiProvider: dto.aiProvider ?? null,
        metadata: dto.metadata ?? null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'content.created',
      new ContentCreatedEvent(content.id, content.workspaceId),
    );

    return content;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Content>> {
    return this.contentRepository.findAll(options);
  }

  async findByCampaign(campaignId: string): Promise<Content[]> {
    return this.contentRepository.listByCampaign(campaignId);
  }

  async findById(id: string): Promise<Content> {
    const content = await this.contentRepository.findById(id);
    if (!content) {
      throw new NotFoundException(`Content with id "${id}" not found`);
    }
    return content;
  }

  async update(id: string, dto: UpdateContentDto, actorId?: string): Promise<Content> {
    await this.findById(id);
    return this.contentRepository.update(
      id,
      {
        title: dto.title,
        body: dto.body,
        type: dto.type,
        status: dto.status,
        campaignId: dto.campaignId,
        aiGenerated: dto.aiGenerated,
        aiProvider: dto.aiProvider,
        metadata: dto.metadata,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.contentRepository.delete(id, actorId);
  }
}
