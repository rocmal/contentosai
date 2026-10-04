import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_QUALITIES,
  ImageAspectRatio,
  ImageQuality,
} from '../../domain/image-formats';

export const IMAGE_PROVIDER_NAMES = ['openai', 'stability', 'flux'] as const;

export class GenerateImageDto {
  @ApiProperty({ example: 'A minimalist logo for an AI content studio, flat vector style' })
  @IsString()
  @MaxLength(4000)
  prompt!: string;

  @ApiProperty({ enum: IMAGE_PROVIDER_NAMES })
  @IsIn(IMAGE_PROVIDER_NAMES)
  provider!: (typeof IMAGE_PROVIDER_NAMES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: '1024x1024', description: 'Ignored when aspectRatio is given' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ enum: IMAGE_ASPECT_RATIOS, description: 'Preferred way to choose the shape' })
  @IsOptional()
  @IsIn(IMAGE_ASPECT_RATIOS)
  aspectRatio?: ImageAspectRatio;

  @ApiPropertyOptional({ enum: IMAGE_QUALITIES, default: 'standard', description: 'Sets both quality and the credits charged' })
  @IsOptional()
  @IsIn(IMAGE_QUALITIES)
  quality?: ImageQuality;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;

  @ApiPropertyOptional({
    default: true,
    description:
      'false = preview only: images come back inline and nothing is stored in the gallery. Credits are charged either way.',
  })
  @IsOptional()
  @IsBoolean()
  saveToGallery?: boolean;
}
