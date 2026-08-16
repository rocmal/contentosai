import { FindAllOptions, IBaseRepository, PaginatedResult } from '@shared/interfaces/base-repository.interface';
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
  /** System roles (organizationId null, e.g. seeded "super-admin"/"member")
   * plus this organization's own custom roles - never another org's. Plain
   * findAll() has no organization concept and would leak every tenant's
   * custom roles to every other tenant. */
  findAllForOrganization(organizationId: string, options?: FindAllOptions): Promise<PaginatedResult<Role>>;
}
