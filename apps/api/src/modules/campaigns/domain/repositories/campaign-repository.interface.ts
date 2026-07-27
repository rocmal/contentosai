import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Campaign, CampaignStatus } from '../entities/campaign.entity';

export interface CreateCampaignData {
  organizationId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  status?: CampaignStatus;
  startDate?: Date | null;
  endDate?: Date | null;
}

export type UpdateCampaignData = Partial<
  Omit<CreateCampaignData, 'organizationId' | 'workspaceId'>
>;

export const CAMPAIGNS_REPOSITORY = Symbol('CAMPAIGNS_REPOSITORY');

export interface ICampaignsRepository extends IBaseRepository<
  Campaign,
  CreateCampaignData,
  UpdateCampaignData
> {
  listByWorkspace(workspaceId: string): Promise<Campaign[]>;
}
