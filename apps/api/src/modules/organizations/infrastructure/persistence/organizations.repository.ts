import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Organization } from '../../domain/entities/organization.entity';
import {
  CreateOrganizationData,
  IOrganizationsRepository,
  UpdateOrganizationData,
} from '../../domain/repositories/organization-repository.interface';
import { OrganizationModel } from './organization.model';

@Injectable()
export class OrganizationsRepository
  extends BaseRepository<
    OrganizationModel,
    Organization,
    CreateOrganizationData,
    UpdateOrganizationData
  >
  implements IOrganizationsRepository
{
  constructor(@InjectModel(OrganizationModel) model: typeof OrganizationModel) {
    super(model);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.findOne({ slug });
  }

  protected toEntity(instance: OrganizationModel): Organization {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      name: plain.name,
      slug: plain.slug,
      ownerId: plain.ownerId,
      status: plain.status,
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
