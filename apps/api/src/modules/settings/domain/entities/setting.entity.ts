import { BaseEntity } from '@shared/domain/base.entity';

export interface Setting extends BaseEntity {
  organizationId: string;
  key: string;
  value: unknown;
}
