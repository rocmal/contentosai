import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum ProjectStatus {
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export interface Project extends BaseTenantEntity {
  campaignId: string | null;
  title: string;
  category: string;
  description: string | null;
  status: ProjectStatus;
}
