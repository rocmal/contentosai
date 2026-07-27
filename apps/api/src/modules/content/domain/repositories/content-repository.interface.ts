import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Content, ContentStatus, ContentType } from '../entities/content.entity';

export interface CreateContentData {
  organizationId: string;
  workspaceId: string;
  campaignId?: string | null;
  title: string;
  body: string;
  type: ContentType;
  status?: ContentStatus;
  aiGenerated?: boolean;
  aiProvider?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type UpdateContentData = Partial<Omit<CreateContentData, 'organizationId' | 'workspaceId'>>;

export const CONTENT_REPOSITORY = Symbol('CONTENT_REPOSITORY');

export interface IContentRepository extends IBaseRepository<
  Content,
  CreateContentData,
  UpdateContentData
> {
  listByCampaign(campaignId: string): Promise<Content[]>;
}
