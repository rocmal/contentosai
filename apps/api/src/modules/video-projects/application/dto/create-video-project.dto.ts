import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VideoProjectSource, VideoProjectStatus } from '../../domain/entities/video-project.entity';

export class VideoProjectSceneDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsUrl()
  visualUrl!: string;

  @ApiProperty({ enum: ['video', 'image'] })
  @IsIn(['video', 'image'])
  visualType!: 'video' | 'image';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  durationSeconds!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  focalXPct!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  focalYPct!: number;

  @ApiProperty()
  @IsString()
  filter!: string;

  @ApiProperty()
  @IsString()
  motion!: string;
}

export class CreateVideoProjectDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiPropertyOptional({ example: 'Fall menu launch reel' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ enum: VideoProjectSource, default: VideoProjectSource.SCENES })
  @IsOptional()
  @IsEnum(VideoProjectSource)
  source?: VideoProjectSource;

  @ApiPropertyOptional({ enum: VideoProjectStatus })
  @IsOptional()
  @IsEnum(VideoProjectStatus)
  status?: VideoProjectStatus;

  @ApiPropertyOptional({ type: [VideoProjectSceneDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VideoProjectSceneDto)
  scenes?: VideoProjectSceneDto[];

  @ApiPropertyOptional({ example: '16:9' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  aspectRatio?: string;

  @ApiPropertyOptional({ example: 'none' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  transition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrationText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  narrationVoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  narrationGender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  narrationLanguage?: string;
}
