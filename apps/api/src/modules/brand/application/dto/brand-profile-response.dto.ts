import { ApiProperty } from '@nestjs/swagger';
import { BrandProfile } from '../../domain/entities/brand-profile.entity';

export class BrandProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) industry: string | null;
  @ApiProperty({ nullable: true }) toneOfVoice: string | null;
  @ApiProperty({ type: [String], nullable: true }) brandColors: string[] | null;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
  @ApiProperty({ nullable: true }) guidelines: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(brandProfile: BrandProfile) {
    this.id = brandProfile.id;
    this.organizationId = brandProfile.organizationId;
    this.workspaceId = brandProfile.workspaceId;
    this.name = brandProfile.name;
    this.industry = brandProfile.industry;
    this.toneOfVoice = brandProfile.toneOfVoice;
    this.brandColors = brandProfile.brandColors;
    this.logoUrl = brandProfile.logoUrl;
    this.guidelines = brandProfile.guidelines;
    this.createdAt = brandProfile.createdAt;
    this.updatedAt = brandProfile.updatedAt;
  }
}
