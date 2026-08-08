import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { BrandProfile } from '../../domain/entities/brand-profile.entity';
import {
  CreateBrandProfileData,
  IBrandProfilesRepository,
  UpdateBrandProfileData,
} from '../../domain/repositories/brand-profile-repository.interface';
import { BrandProfileModel } from './brand-profile.model';

@Injectable()
export class BrandProfilesRepository
  extends BaseRepository<
    BrandProfileModel,
    BrandProfile,
    CreateBrandProfileData,
    UpdateBrandProfileData
  >
  implements IBrandProfilesRepository
{
  constructor(@InjectModel(BrandProfileModel) model: typeof BrandProfileModel) {
    super(model);
  }

  async listByWorkspace(workspaceId: string): Promise<BrandProfile[]> {
    const instances = await this.model.findAll({ where: { workspaceId } });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: BrandProfileModel): BrandProfile {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      name: plain.name,
      industry: plain.industry,
      tagline: plain.tagline,
      toneOfVoice: plain.toneOfVoice,
      brandColors: plain.brandColors,
      logoUrl: plain.logoUrl,
      guidelines: plain.guidelines,
      websiteUrl: plain.websiteUrl,
      primaryFont: plain.primaryFont,
      productsAndServices: plain.productsAndServices,
      mission: plain.mission,
      vision: plain.vision,
      primaryCTA: plain.primaryCTA,
      targetAudience: plain.targetAudience,
      competitors: plain.competitors,
      keywords: plain.keywords,
      socialAccounts: plain.socialAccounts,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
