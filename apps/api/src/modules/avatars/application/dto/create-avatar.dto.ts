import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AvatarAgeGroup, AvatarCategory, AvatarGender } from '../../domain/entities/avatar.entity';

export class CreateAvatarDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  imageUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: AvatarCategory, default: AvatarCategory.CUSTOM })
  @IsOptional()
  @IsEnum(AvatarCategory)
  category?: AvatarCategory;

  @ApiPropertyOptional({ enum: AvatarGender, default: AvatarGender.UNKNOWN })
  @IsOptional()
  @IsEnum(AvatarGender)
  gender?: AvatarGender;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  voiceId?: string;

  @ApiPropertyOptional({ example: 'friendly' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  emotionDefault?: string;

  @ApiPropertyOptional({ enum: AvatarAgeGroup, default: AvatarAgeGroup.UNKNOWN })
  @IsOptional()
  @IsEnum(AvatarAgeGroup)
  ageGroup?: AvatarAgeGroup;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({ default: 'mock' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
