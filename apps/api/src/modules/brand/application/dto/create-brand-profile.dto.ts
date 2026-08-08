import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BrandSocialAccountDto {
  @ApiProperty()
  @IsString()
  platform!: string;

  @ApiProperty()
  @IsString()
  handle!: string;

  @ApiProperty()
  @IsBoolean()
  connected!: boolean;
}

export class CreateBrandProfileDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  industry?: string;

  @ApiPropertyOptional({ example: 'Empowering Next-Gen Workflows' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string;

  @ApiPropertyOptional({ type: [String], example: ['Authoritative', 'Friendly', 'Direct'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toneOfVoice?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Hex color codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brandColors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guidelines?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryFont?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productsAndServices?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mission?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vision?: string;

  @ApiPropertyOptional({ example: 'Start 14-Day Free Trial' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryCTA?: string;

  @ApiPropertyOptional({ example: 'Product Leaders, Tech Founders' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetAudience?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ type: [BrandSocialAccountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandSocialAccountDto)
  socialAccounts?: BrandSocialAccountDto[];
}
