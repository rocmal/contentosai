import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const AI_PROVIDER_NAMES = ['openai', 'gemini', 'claude', 'openrouter'] as const;

export class GenerateContentDto {
  @ApiProperty({ example: 'Write a 3-line product launch tweet for a productivity app.' })
  @IsString()
  @MaxLength(8000)
  prompt!: string;

  @ApiPropertyOptional({ description: 'Overrides the default system/brand-voice instruction' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @ApiPropertyOptional({ enum: AI_PROVIDER_NAMES, description: 'Defaults to AI_DEFAULT_PROVIDER' })
  @IsOptional()
  @IsIn(AI_PROVIDER_NAMES)
  provider?: (typeof AI_PROVIDER_NAMES)[number];

  @ApiPropertyOptional({
    description: 'Vendor-specific model id; provider default used if omitted',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ default: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @ApiPropertyOptional({ default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
