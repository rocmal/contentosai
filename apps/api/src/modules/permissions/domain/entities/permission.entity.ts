import { BaseEntity } from '@shared/domain/base.entity';

export interface Permission extends BaseEntity {
  name: string;
  slug: string;
  module: string;
  description: string | null;
}
