import { BaseEntity } from '@shared/domain/base.entity';

export interface Role extends BaseEntity {
  organizationId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissionSlugs?: string[];
}
