import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import {
  IPermissionsRepository,
  PERMISSIONS_REPOSITORY,
} from '@modules/permissions/domain/repositories/permission-repository.interface';
import { Role } from '../../domain/entities/role.entity';
import {
  IRolesRepository,
  ROLES_REPOSITORY,
} from '../../domain/repositories/role-repository.interface';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLES_REPOSITORY) private readonly rolesRepository: IRolesRepository,
    @Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: IPermissionsRepository,
  ) {}

  /** organizationId is a trusted param the controller derives from the
   * caller's own JWT, never client input - see the note on CreateRoleDto for
   * why. Every role created through this path is a plain custom org role
   * (isSystem always false); system roles only ever come from seeders. */
  async create(dto: CreateRoleDto, organizationId: string, actorId?: string): Promise<Role> {
    const existing = await this.rolesRepository.findBySlug(organizationId, dto.slug);
    if (existing) {
      throw new ConflictException(
        `Role with slug "${dto.slug}" already exists for this organization`,
      );
    }

    const role = await this.rolesRepository.create(
      {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        organizationId,
        isSystem: false,
      },
      actorId,
    );

    if (dto.permissionSlugs?.length) {
      await this.syncPermissions(role.id, dto.permissionSlugs);
    }

    return this.findById(role.id);
  }

  /** Throws NotFound if the role doesn't belong to this organization (never
   * leaks "it exists but isn't yours" vs "doesn't exist" to the caller) and
   * Forbidden if it's a shared system role (super-admin/member) - editing
   * those would silently change permissions for every other tenant on the
   * platform too. */
  private async findOwnedForMutation(id: string, organizationId: string): Promise<Role> {
    const role = await this.findById(id);
    if (role.organizationId !== organizationId) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be modified.');
    }
    return role;
  }

  async findAllForOrganization(organizationId: string, options?: FindAllOptions): Promise<PaginatedResult<Role>> {
    return this.rolesRepository.findAllForOrganization(organizationId, options);
  }

  async findById(id: string): Promise<Role> {
    const role = await this.rolesRepository.findWithPermissions(id);
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, organizationId: string, actorId?: string): Promise<Role> {
    await this.findOwnedForMutation(id, organizationId);
    await this.rolesRepository.update(
      id,
      {
        name: dto.name,
        description: dto.description,
      },
      actorId,
    );

    if (dto.permissionSlugs) {
      await this.syncPermissions(id, dto.permissionSlugs);
    }

    return this.findById(id);
  }

  async remove(id: string, organizationId: string, actorId?: string): Promise<void> {
    await this.findOwnedForMutation(id, organizationId);
    await this.rolesRepository.delete(id, actorId);
  }

  private async syncPermissions(roleId: string, permissionSlugs: string[]): Promise<void> {
    const permissions = await this.permissionsRepository.findBySlugs(permissionSlugs);
    await this.rolesRepository.syncPermissions(
      roleId,
      permissions.map((permission) => permission.id),
    );
  }
}
