import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { PublishingJob, PublishingJobStatus } from '../../domain/entities/publishing-job.entity';
import {
  IPublishingJobsRepository,
  PUBLISHING_JOBS_REPOSITORY,
} from '../../domain/repositories/publishing-job-repository.interface';
import { CreatePublishingJobDto } from '../dto/create-publishing-job.dto';
import { UpdatePublishingJobDto } from '../dto/update-publishing-job.dto';
import { PublishingJobCreatedEvent } from '../events/publishing-job-created.event';

/** Who is asking - taken from the signed-in user, never from the request body. */
export interface PublishingActor {
  id: string;
  workspaceId: string | null;
  roles: string[];
}

export interface PublishingSummary {
  scheduled: number;
  published: number;
  failed: number;
}

export interface ListJobsOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/** Workspace admins can manage the team's scheduled posts; everyone else only their own. */
const MANAGER_ROLES = ['super-admin', 'admin'];

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

  /** The workspace's posts only - never another customer's. */
  async listForWorkspace(
    actor: PublishingActor,
    options: ListJobsOptions = {},
  ): Promise<PaginatedResult<PublishingJob>> {
    if (!actor.workspaceId) {
      return {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: options.limit ?? 20,
          totalPages: 1,
          currentPage: 1,
        },
      };
    }
    return this.publishingJobsRepository.findAll({
      ...options,
      filters: { workspaceId: actor.workspaceId },
    });
  }

  /** Exact counts of the workspace's posts by status, for the dashboard. */
  async summarize(actor: PublishingActor): Promise<PublishingSummary> {
    if (!actor.workspaceId) return { scheduled: 0, published: 0, failed: 0 };
    const workspaceId = actor.workspaceId;
    const [scheduled, published, failed] = await Promise.all([
      this.publishingJobsRepository.count({ workspaceId, status: PublishingJobStatus.SCHEDULED }),
      this.publishingJobsRepository.count({ workspaceId, status: PublishingJobStatus.PUBLISHED }),
      this.publishingJobsRepository.count({ workspaceId, status: PublishingJobStatus.FAILED }),
    ]);
    return { scheduled, published, failed };
  }

  async findById(id: string): Promise<PublishingJob> {
    const publishingJob = await this.publishingJobsRepository.findById(id);
    if (!publishingJob) {
      throw new NotFoundException(`PublishingJob with id "${id}" not found`);
    }
    return publishingJob;
  }

  /** One post, but only if it belongs to the viewer's workspace - otherwise it looks like it does not exist. */
  async findForActor(id: string, actor: PublishingActor): Promise<PublishingJob> {
    const publishingJob = await this.findById(id);
    if (!actor.workspaceId || publishingJob.workspaceId !== actor.workspaceId) {
      throw new NotFoundException(`PublishingJob with id "${id}" not found`);
    }
    return publishingJob;
  }

  private async findManageable(id: string, actor: PublishingActor): Promise<PublishingJob> {
    const publishingJob = await this.findForActor(id, actor);
    const isOwner = publishingJob.createdBy === actor.id;
    if (!isOwner && !actor.roles.some((role) => MANAGER_ROLES.includes(role))) {
      throw new NotFoundException(`PublishingJob with id "${id}" not found`);
    }
    return publishingJob;
  }

  /** For the background publishing worker, which updates a job's status with no signed-in user. */
  async updateAsSystem(id: string, dto: UpdatePublishingJobDto): Promise<PublishingJob> {
    await this.findById(id);
    return this.updateRecord(id, dto);
  }

  async update(
    id: string,
    dto: UpdatePublishingJobDto,
    actor: PublishingActor,
  ): Promise<PublishingJob> {
    await this.findManageable(id, actor);
    return this.updateRecord(id, dto, actor.id);
  }

  private updateRecord(
    id: string,
    dto: UpdatePublishingJobDto,
    actorId?: string,
  ): Promise<PublishingJob> {
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

  async remove(id: string, actor: PublishingActor): Promise<void> {
    await this.findManageable(id, actor);
    await this.publishingJobsRepository.delete(id, actor.id);
  }
}
