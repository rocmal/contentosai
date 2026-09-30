import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Content, ContentStatus, ContentType } from '../entities/content.entity';

export interface CreateContentData {
  organizationId: string;
  workspaceId: string;
  campaignId?: string | null;
  projectId?: string | null;
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
  /** Number of (non-deleted) content items per project id; projects with none are omitted. */
  countByProject(projectIds: string[]): Promise<Record<string, number>>;
}
