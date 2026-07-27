import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Permission } from '../../domain/entities/permission.entity';
import {
  CreatePermissionData,
  IPermissionsRepository,
  UpdatePermissionData,
} from '../../domain/repositories/permission-repository.interface';
import { PermissionModel } from './permission.model';

@Injectable()
export class PermissionsRepository
  extends BaseRepository<PermissionModel, Permission, CreatePermissionData, UpdatePermissionData>
  implements IPermissionsRepository
{
  constructor(@InjectModel(PermissionModel) model: typeof PermissionModel) {
    super(model);
  }

  async findBySlug(slug: string): Promise<Permission | null> {
    return this.findOne({ slug });
  }

  async findBySlugs(slugs: string[]): Promise<Permission[]> {
    const instances = await this.model.findAll({ where: { slug: { [Op.in]: slugs } } });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: PermissionModel): Permission {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      name: plain.name,
      slug: plain.slug,
      module: plain.module,
      description: plain.description,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
