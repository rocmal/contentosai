import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';
import { VideoTemplateVisibility } from '../../domain/entities/video-template.entity';

export class CreateVideoTemplateDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'Product launch teaser' })
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiProperty({ description: 'Already-uploaded video URL (see POST /storage/upload)' })
  @IsUrl()
  videoUrl!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  storageKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiProperty({ example: '16:9' })
  @IsString()
  @MaxLength(20)
  aspectRatio!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiProperty({
    enum: VideoTemplateVisibility,
    description: 'private = only you can reuse it; team = anyone in your workspace can',
  })
  @IsEnum(VideoTemplateVisibility)
  visibility!: VideoTemplateVisibility;
}
