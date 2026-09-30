import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AI_PROVIDER_NAMES } from './generate-content.dto';
import {
  CONTENT_FORMAT_IDS,
  CONTENT_LANGUAGES,
  ContentFormatId,
  ContentLanguage,
} from '../content-studio/content-formats';

export class StudioGenerateDto {
  @ApiProperty({ enum: CONTENT_FORMAT_IDS })
  @IsIn(CONTENT_FORMAT_IDS)
  format!: ContentFormatId;

  @ApiPropertyOptional({ example: 'Lead Generation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  goal?: string;

  @ApiPropertyOptional({ description: 'Overrides the brand profile target audience for this piece' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  audience?: string;

  @ApiProperty({ example: 'Why every young parent should plan for their child\'s education early' })
  @IsString()
  @MaxLength(500)
  topic!: string;

  @ApiPropertyOptional({ description: 'Extra instructions or verified facts to use (products, figures)' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  customPrompt?: string;

  @ApiPropertyOptional({ enum: CONTENT_LANGUAGES, default: 'english' })
  @IsOptional()
  @IsIn(CONTENT_LANGUAGES)
  language?: ContentLanguage;

  @ApiPropertyOptional({ enum: AI_PROVIDER_NAMES, description: 'Defaults to AI_DEFAULT_PROVIDER' })
  @IsOptional()
  @IsIn(AI_PROVIDER_NAMES)
  provider?: (typeof AI_PROVIDER_NAMES)[number];

  @ApiPropertyOptional({ default: true, description: 'Append the brand advisor details and any required disclaimer' })
  @IsOptional()
  @IsBoolean()
  includeAdvisorDetails?: boolean;
}
