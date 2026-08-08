import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { PublishingJob } from '../../domain/entities/publishing-job.entity';
import {
  IPublishingJobsRepository,
  PUBLISHING_JOBS_REPOSITORY,
} from '../../domain/repositories/publishing-job-repository.interface';
import { CreatePublishingJobDto } from '../dto/create-publishing-job.dto';
import { UpdatePublishingJobDto } from '../dto/update-publishing-job.dto';
import { PublishingJobCreatedEvent } from '../events/publishing-job-created.event';

@Injectable()
export class PublishingJobsService {
  constructor(
    @Inject(PUBLISHING_JOBS_REPOSITORY)
    private readonly publishingJobsRepository: IPublishingJobsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreatePublishingJobDto, actorId?: string): Promise<PublishingJob> {
    const publishingJob = await this.publishingJobsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        contentId: dto.contentId ?? null,
        platform: dto.platform,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        externalPostId: dto.externalPostId ?? null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'publishing.created',
      new PublishingJobCreatedEvent(
        publishingJob.id,
        publishingJob.workspaceId,
        publishingJob.status,
        publishingJob.scheduledAt,
      ),
    );

    return publishingJob;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<PublishingJob>> {
    return this.publishingJobsRepository.findAll(options);
  }

  async findById(id: string): Promise<PublishingJob> {
    const publishingJob = await this.publishingJobsRepository.findById(id);
    if (!publishingJob) {
      throw new NotFoundException(`PublishingJob with id "${id}" not found`);
    }
    return publishingJob;
  }

  async update(id: string, dto: UpdatePublishingJobDto, actorId?: string): Promise<PublishingJob> {
    await this.findById(id);
    return this.publishingJobsRepository.update(
      id,
      {
        contentId: dto.contentId,
        platform: dto.platform,
        status: dto.status,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        externalPostId: dto.externalPostId,
        permalink: dto.permalink,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.publishingJobsRepository.delete(id, actorId);
  }
}
