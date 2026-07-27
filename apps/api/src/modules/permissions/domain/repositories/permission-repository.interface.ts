import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Permission } from '../entities/permission.entity';

export interface CreatePermissionData {
  name: string;
  slug: string;
  module: string;
  description?: string | null;
}

export type UpdatePermissionData = Partial<CreatePermissionData>;

export const PERMISSIONS_REPOSITORY = Symbol('PERMISSIONS_REPOSITORY');

export interface IPermissionsRepository extends IBaseRepository<
  Permission,
  CreatePermissionData,
  UpdatePermissionData
> {
  findBySlug(slug: string): Promise<Permission | null>;
  findBySlugs(slugs: string[]): Promise<Permission[]>;
}
