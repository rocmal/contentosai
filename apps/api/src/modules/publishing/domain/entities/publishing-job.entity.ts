import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum PublishingJobStatus {
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export interface PublishingJob extends BaseTenantEntity {
  contentId: string | null;
  platform: string;
  status: PublishingJobStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  externalPostId: string | null;
  permalink: string | null;
}
