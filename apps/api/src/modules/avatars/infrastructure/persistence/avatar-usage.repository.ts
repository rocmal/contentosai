import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { AvatarUsage } from '../../domain/entities/avatar.entity';
import {
  CreateAvatarUsageData,
  IAvatarUsageRepository,
  UpdateAvatarUsageData,
} from '../../domain/repositories/avatar-repository.interface';
import { AvatarUsageModel } from './avatar-usage.model';

@Injectable()
export class AvatarUsageRepository
  extends BaseRepository<AvatarUsageModel, AvatarUsage, CreateAvatarUsageData, UpdateAvatarUsageData>
  implements IAvatarUsageRepository
{
  constructor(@InjectModel(AvatarUsageModel) model: typeof AvatarUsageModel) {
    super(model);
  }

  findByAvatarId(avatarId: string): Promise<AvatarUsage | null> {
    return this.findOne({ avatarId });
  }

  protected toEntity(instance: AvatarUsageModel): AvatarUsage {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      avatarId: plain.avatarId,
      projectId: plain.projectId,
      campaignId: plain.campaignId,
      videoId: plain.videoId,
      lastUsed: plain.lastUsed,
      usageCount: plain.usageCount,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
