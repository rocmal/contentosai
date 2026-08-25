import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';
import { VideoAspectRatio } from '../interfaces/conversational-video.port';

export enum VideoEditSessionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/**
 * Aggregate root for a conversational video lineage. Owns one or more
 * `VideoEditTurn` rows forming a parent/child chain.
 */
export interface VideoEditSession extends BaseTenantEntity {
  title: string;
  provider: string;
  modelId: string;
  aspectRatio: VideoAspectRatio;
  status: VideoEditSessionStatus;
  rootTurnId: string | null;
  latestTurnId: string | null;
}
