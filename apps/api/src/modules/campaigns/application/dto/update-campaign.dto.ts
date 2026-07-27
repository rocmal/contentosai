import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCampaignDto } from './create-campaign.dto';
import { CampaignStatus } from '../../domain/entities/campaign.entity';

export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, ['organizationId', 'workspaceId'] as const),
) {
  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
