import { BaseEntity } from '@shared/domain/base.entity';

export enum WorkspaceStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface Workspace extends BaseEntity {
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  status: WorkspaceStatus;
}
