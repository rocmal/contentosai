import { BaseEntity } from '@shared/domain/base.entity';

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  ownerId: string;
  status: OrganizationStatus;
  description: string | null;
}
