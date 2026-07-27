import { BaseEntity } from '@shared/domain/base.entity';

export interface OrganizationMember extends BaseEntity {
  organizationId: string;
  userId: string;
  roleId: string;
}
