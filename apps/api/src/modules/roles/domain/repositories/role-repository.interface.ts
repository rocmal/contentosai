import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Role } from '../entities/role.entity';

export interface CreateRoleData {
  organizationId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  isSystem?: boolean;
}

export type UpdateRoleData = Partial<CreateRoleData>;

export const ROLES_REPOSITORY = Symbol('ROLES_REPOSITORY');

export interface IRolesRepository extends IBaseRepository<Role, CreateRoleData, UpdateRoleData> {
  findBySlug(organizationId: string | null, slug: string): Promise<Role | null>;
  findWithPermissions(id: string): Promise<Role | null>;
  syncPermissions(roleId: string, permissionIds: string[]): Promise<void>;
}
