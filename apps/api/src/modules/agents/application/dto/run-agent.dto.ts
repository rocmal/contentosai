import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AI_PROVIDER_NAMES } from '@modules/ai/application/dto/generate-content.dto';
import { CONTENT_LANGUAGES, ContentLanguage } from '@modules/ai/application/content-studio/content-formats';

export class RunAgentDto {
  @ApiProperty({ description: 'The task, brief or draft for the agent to work on' })
  @IsString()
  @MinLength(3)
  @MaxLength(8000)
  input!: string;

  @ApiPropertyOptional({ enum: CONTENT_LANGUAGES, default: 'english' })
  @IsOptional()
  @IsIn(CONTENT_LANGUAGES)
  language?: ContentLanguage;

  @ApiPropertyOptional({ enum: AI_PROVIDER_NAMES })
  @IsOptional()
  @IsIn(AI_PROVIDER_NAMES)
  provider?: (typeof AI_PROVIDER_NAMES)[number];
}
