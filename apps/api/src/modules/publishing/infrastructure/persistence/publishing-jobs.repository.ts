import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { PublishingJob } from '../../domain/entities/publishing-job.entity';
import {
  CreatePublishingJobData,
  IPublishingJobsRepository,
  UpdatePublishingJobData,
} from '../../domain/repositories/publishing-job-repository.interface';
import { PublishingJobModel } from './publishing-job.model';

@Injectable()
export class PublishingJobsRepository
  extends BaseRepository<
    PublishingJobModel,
    PublishingJob,
    CreatePublishingJobData,
    UpdatePublishingJobData
  >
  implements IPublishingJobsRepository
{
  constructor(@InjectModel(PublishingJobModel) model: typeof PublishingJobModel) {
    super(model);
  }

  protected toEntity(instance: PublishingJobModel): PublishingJob {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      contentId: plain.contentId,
      platform: plain.platform,
      status: plain.status,
      scheduledAt: plain.scheduledAt,
      publishedAt: plain.publishedAt,
      externalPostId: plain.externalPostId,
      permalink: plain.permalink,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
