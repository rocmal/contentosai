import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { PublishingJob, PublishingJobStatus } from '../entities/publishing-job.entity';

export interface CreatePublishingJobData {
  organizationId: string;
  workspaceId: string;
  contentId?: string | null;
  platform: string;
  status?: PublishingJobStatus;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  externalPostId?: string | null;
}

export type UpdatePublishingJobData = Partial<
  Omit<CreatePublishingJobData, 'organizationId' | 'workspaceId'>
>;

export const PUBLISHING_JOBS_REPOSITORY = Symbol('PUBLISHING_JOBS_REPOSITORY');

export type IPublishingJobsRepository = IBaseRepository<
  PublishingJob,
  CreatePublishingJobData,
  UpdatePublishingJobData
>;
