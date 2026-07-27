import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, IsUUID, IsUrl, Min, MaxLength } from 'class-validator';
import { MediaAssetType } from '../../domain/entities/media-asset.entity';

export class CreateMediaAssetDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'hero-banner.png' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'workspaces/abc/media/hero-banner.png' })
  @IsString()
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  @MaxLength(150)
  mimeType!: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @ApiProperty({ enum: MediaAssetType })
  @IsEnum(MediaAssetType)
  type!: MediaAssetType;
}
