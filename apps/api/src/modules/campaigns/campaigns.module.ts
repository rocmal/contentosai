import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CampaignModel } from './infrastructure/persistence/campaign.model';
import { CampaignsRepository } from './infrastructure/persistence/campaigns.repository';
import { CAMPAIGNS_REPOSITORY } from './domain/repositories/campaign-repository.interface';
import { CampaignsService } from './application/services/campaigns.service';
import { CampaignsController } from './presentation/campaigns.controller';

@Module({
  imports: [SequelizeModule.forFeature([CampaignModel])],
  controllers: [CampaignsController],
  providers: [CampaignsService, { provide: CAMPAIGNS_REPOSITORY, useClass: CampaignsRepository }],
  exports: [CampaignsService, CAMPAIGNS_REPOSITORY],
})
export class CampaignsModule {}
