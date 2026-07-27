import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface Content extends BaseTenantEntity {
  campaignId: string | null;
  title: string;
  body: string;
  type: ContentType;
  status: ContentStatus;
  aiGenerated: boolean;
  aiProvider: string | null;
  metadata: Record<string, unknown> | null;
}
