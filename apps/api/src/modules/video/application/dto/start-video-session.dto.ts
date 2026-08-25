import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { GenerationTier, StylePreset } from '@modules/video-credits/domain/enums/generation.enums';
import { VideoAspectRatio } from '../../domain/interfaces/conversational-video.port';
import { ReferenceImageDto } from './reference-image.dto';
import { SceneShotDto } from './scene-shot.dto';

export class StartVideoSessionDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'Spring campaign teaser' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ type: [SceneShotDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SceneShotDto)
  shots!: SceneShotDto[];

  @ApiPropertyOptional({ type: [ReferenceImageDto] })
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ReferenceImageDto)
  referenceImages: ReferenceImageDto[] = [];

  @ApiPropertyOptional({
    enum: GenerationTier,
    default: GenerationTier.FAST,
    description:
      'Public quality tier. The model serving it is chosen by the router and may change without notice; the credit price will not.',
  })
  @IsOptional()
  @IsEnum(GenerationTier)
  tier: GenerationTier = GenerationTier.FAST;

  @ApiPropertyOptional({ enum: StylePreset, default: StylePreset.REALISTIC })
  @IsOptional()
  @IsEnum(StylePreset)
  style: StylePreset = StylePreset.REALISTIC;

  @ApiPropertyOptional({ enum: VideoAspectRatio, default: VideoAspectRatio.PORTRAIT })
  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspectRatio: VideoAspectRatio = VideoAspectRatio.PORTRAIT;

  @ApiPropertyOptional({
    description: 'Emit an explicit single-continuous-shot instruction',
    default: false,
  })
  @IsBoolean()
  singleContinuousShot = false;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Things to suppress. Rendered as "No X." lines because the model has no negative-prompt parameter.',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  negatives: string[] = [];

  @ApiPropertyOptional({ example: 'Include calm background music. No dialogue.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  audioDirection?: string;
}
