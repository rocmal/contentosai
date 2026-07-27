import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

  async create(dto: CreateRoleDto, actorId?: string): Promise<Role> {
    const existing = await this.rolesRepository.findBySlug(dto.organizationId ?? null, dto.slug);
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
        organizationId: dto.organizationId ?? null,
        isSystem: dto.isSystem ?? false,
      },
      actorId,
    );

    if (dto.permissionSlugs?.length) {
      await this.syncPermissions(role.id, dto.permissionSlugs);
    }

    return this.findById(role.id);
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Role>> {
    return this.rolesRepository.findAll(options);
  }

  async findById(id: string): Promise<Role> {
    const role = await this.rolesRepository.findWithPermissions(id);
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string): Promise<Role> {
    await this.findById(id);
    await this.rolesRepository.update(
      id,
      {
        name: dto.name,
        description: dto.description,
        isSystem: dto.isSystem,
      },
      actorId,
    );

    if (dto.permissionSlugs) {
      await this.syncPermissions(id, dto.permissionSlugs);
    }

    return this.findById(id);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
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
