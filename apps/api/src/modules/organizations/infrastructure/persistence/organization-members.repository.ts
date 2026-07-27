import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { OrganizationMember } from '../../domain/entities/organization-member.entity';
import {
  CreateOrganizationMemberData,
  IOrganizationMembersRepository,
  UpdateOrganizationMemberData,
} from '../../domain/repositories/organization-member-repository.interface';
import { OrganizationMemberModel } from './organization-member.model';

@Injectable()
export class OrganizationMembersRepository
  extends BaseRepository<
    OrganizationMemberModel,
    OrganizationMember,
    CreateOrganizationMemberData,
    UpdateOrganizationMemberData
  >
  implements IOrganizationMembersRepository
{
  constructor(@InjectModel(OrganizationMemberModel) model: typeof OrganizationMemberModel) {
    super(model);
  }

  async findMembership(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return this.findOne({ organizationId, userId });
  }

  async listByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    const instances = await this.model.findAll({ where: { organizationId } });
    return instances.map((instance) => this.toEntity(instance));
  }

  async listByUser(userId: string): Promise<OrganizationMember[]> {
    const instances = await this.model.findAll({ where: { userId } });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: OrganizationMemberModel): OrganizationMember {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      userId: plain.userId,
      roleId: plain.roleId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
