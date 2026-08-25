import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  GenerationMode,
  GenerationTier,
  StylePreset,
} from '../../domain/enums/generation.enums';

export class QuoteGenerationDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty({ enum: GenerationTier })
  @IsEnum(GenerationTier)
  tier!: GenerationTier;

  @ApiProperty({ enum: GenerationMode })
  @IsEnum(GenerationMode)
  mode!: GenerationMode;

  @ApiPropertyOptional({ enum: StylePreset, default: StylePreset.REALISTIC })
  @IsOptional()
  @IsEnum(StylePreset)
  style: StylePreset = StylePreset.REALISTIC;

  @ApiProperty({ description: 'Seconds, minutes, images or 1k-token blocks, per the tier unit' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresNativeAudio?: boolean;
}
