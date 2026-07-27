import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { PermissionModel } from '@modules/permissions/infrastructure/persistence/permission.model';
import { Role } from '../../domain/entities/role.entity';
import {
  CreateRoleData,
  IRolesRepository,
  UpdateRoleData,
} from '../../domain/repositories/role-repository.interface';
import { RoleModel } from './role.model';
import { RolePermissionModel } from './role-permission.model';

@Injectable()
export class RolesRepository
  extends BaseRepository<RoleModel, Role, CreateRoleData, UpdateRoleData>
  implements IRolesRepository
{
  constructor(@InjectModel(RoleModel) model: typeof RoleModel) {
    super(model);
  }

  async findBySlug(organizationId: string | null, slug: string): Promise<Role | null> {
    const instance = await this.model.findOne({
      where: { slug, organizationId: organizationId ?? { [Op.is]: null } },
    });
    return instance ? this.toEntity(instance) : null;
  }

  async findWithPermissions(id: string): Promise<Role | null> {
    const instance = await this.model.findByPk(id, { include: [PermissionModel] });
    return instance ? this.toEntity(instance) : null;
  }

  async syncPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await RolePermissionModel.destroy({ where: { roleId } });
    if (permissionIds.length === 0) {
      return;
    }
    await RolePermissionModel.bulkCreate(
      permissionIds.map((permissionId) => ({ roleId, permissionId }) as never),
    );
  }

  protected toEntity(instance: RoleModel): Role {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      name: plain.name,
      slug: plain.slug,
      description: plain.description,
      isSystem: plain.isSystem,
      permissionSlugs: plain.permissions?.map((permission: { slug: string }) => permission.slug),
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
