import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export const VIDEO_PROVIDER_NAMES = ['veo', 'runway', 'kling', 'pika'] as const;

export class GenerateVideoDto {
  @ApiProperty({ example: 'A drone shot flying over a futuristic city at sunset' })
  @IsString()
  @MaxLength(4000)
  prompt!: string;

  @ApiProperty({ enum: VIDEO_PROVIDER_NAMES })
  @IsIn(VIDEO_PROVIDER_NAMES)
  provider!: (typeof VIDEO_PROVIDER_NAMES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Optional reference/starting image for image-to-video' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  durationSeconds?: number;
}
