import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional({ example: '1024x1024' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;
}
