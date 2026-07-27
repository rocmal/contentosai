import { BaseEntity } from './base.entity';

/**
 * Every resource in Lumora belongs to a workspace, which in turn belongs to an
 * organization. Feature entities that are tenant-scoped extend this shape.
 */
export interface BaseTenantEntity extends BaseEntity {
  organizationId: string;
  workspaceId: string;
}
