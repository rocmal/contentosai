import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum VideoTemplateVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
}

export interface VideoTemplate extends BaseTenantEntity {
  title: string;
  videoUrl: string;
  storageKey: string;
  thumbnailUrl: string | null;
  aspectRatio: string;
  durationSeconds: number | null;
  visibility: VideoTemplateVisibility;
}
