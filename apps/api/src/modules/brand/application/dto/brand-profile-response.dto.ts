import { ApiProperty } from '@nestjs/swagger';
import { BrandProfile, BrandSocialAccount } from '../../domain/entities/brand-profile.entity';

export class BrandProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) industry: string | null;
  @ApiProperty({ nullable: true }) tagline: string | null;
  @ApiProperty({ type: [String], nullable: true }) toneOfVoice: string[] | null;
  @ApiProperty({ type: [String], nullable: true }) brandColors: string[] | null;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
  @ApiProperty({ nullable: true }) guidelines: string | null;
  @ApiProperty({ nullable: true }) websiteUrl: string | null;
  @ApiProperty({ nullable: true }) primaryFont: string | null;
  @ApiProperty({ type: [String], nullable: true }) productsAndServices: string[] | null;
  @ApiProperty({ nullable: true }) mission: string | null;
  @ApiProperty({ nullable: true }) vision: string | null;
  @ApiProperty({ nullable: true }) primaryCTA: string | null;
  @ApiProperty({ nullable: true }) targetAudience: string | null;
  @ApiProperty({ type: [String], nullable: true }) competitors: string[] | null;
  @ApiProperty({ type: [String], nullable: true }) keywords: string[] | null;
  @ApiProperty({ nullable: true }) socialAccounts: BrandSocialAccount[] | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(brandProfile: BrandProfile) {
    this.id = brandProfile.id;
    this.organizationId = brandProfile.organizationId;
    this.workspaceId = brandProfile.workspaceId;
    this.name = brandProfile.name;
    this.industry = brandProfile.industry;
    this.tagline = brandProfile.tagline;
    this.toneOfVoice = brandProfile.toneOfVoice;
    this.brandColors = brandProfile.brandColors;
    this.logoUrl = brandProfile.logoUrl;
    this.guidelines = brandProfile.guidelines;
    this.websiteUrl = brandProfile.websiteUrl;
    this.primaryFont = brandProfile.primaryFont;
    this.productsAndServices = brandProfile.productsAndServices;
    this.mission = brandProfile.mission;
    this.vision = brandProfile.vision;
    this.primaryCTA = brandProfile.primaryCTA;
    this.targetAudience = brandProfile.targetAudience;
    this.competitors = brandProfile.competitors;
    this.keywords = brandProfile.keywords;
    this.socialAccounts = brandProfile.socialAccounts;
    this.createdAt = brandProfile.createdAt;
    this.updatedAt = brandProfile.updatedAt;
  }
}
