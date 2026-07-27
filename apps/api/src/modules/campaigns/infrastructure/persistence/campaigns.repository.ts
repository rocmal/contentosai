import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Campaign } from '../../domain/entities/campaign.entity';
import {
  CreateCampaignData,
  ICampaignsRepository,
  UpdateCampaignData,
} from '../../domain/repositories/campaign-repository.interface';
import { CampaignModel } from './campaign.model';

@Injectable()
export class CampaignsRepository
  extends BaseRepository<CampaignModel, Campaign, CreateCampaignData, UpdateCampaignData>
  implements ICampaignsRepository
{
  constructor(@InjectModel(CampaignModel) model: typeof CampaignModel) {
    super(model);
  }

  async listByWorkspace(workspaceId: string): Promise<Campaign[]> {
    const instances = await this.model.findAll({ where: { workspaceId } });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: CampaignModel): Campaign {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      name: plain.name,
      description: plain.description,
      status: plain.status,
      startDate: plain.startDate,
      endDate: plain.endDate,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
