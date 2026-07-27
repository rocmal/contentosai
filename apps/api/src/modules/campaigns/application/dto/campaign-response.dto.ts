import { ApiProperty } from '@nestjs/swagger';
import { Campaign, CampaignStatus } from '../../domain/entities/campaign.entity';

export class CampaignResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ enum: CampaignStatus }) status: CampaignStatus;
  @ApiProperty({ nullable: true }) startDate: Date | null;
  @ApiProperty({ nullable: true }) endDate: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(campaign: Campaign) {
    this.id = campaign.id;
    this.organizationId = campaign.organizationId;
    this.workspaceId = campaign.workspaceId;
    this.name = campaign.name;
    this.description = campaign.description;
    this.status = campaign.status;
    this.startDate = campaign.startDate;
    this.endDate = campaign.endDate;
    this.createdAt = campaign.createdAt;
    this.updatedAt = campaign.updatedAt;
  }
}
