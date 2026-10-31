import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IMAGE_ASPECT_RATIOS, ImageAspectRatio } from '@modules/image/domain/image-formats';

export const MAX_COPILOT_LINKS = 2;

export class CopilotTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  text!: string;
}

export class CopilotMessageDto {
  @ApiProperty({ example: 'Give me 3 hooks for a retirement-planning reel' })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ description: 'The screen the user is on, e.g. "ai-studio"' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  screen?: string;

  @ApiPropertyOptional({
    type: [CopilotTurnDto],
    description: 'Recent conversation turns, oldest first',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CopilotTurnDto)
  history?: CopilotTurnDto[];

  @ApiPropertyOptional({
    type: [String],
    description: `Links to read before answering: a picture (PNG, JPEG, WebP or GIF) or a public web page. At most ${MAX_COPILOT_LINKS}.`,
    example: ['https://example.com/poster.png'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_COPILOT_LINKS)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  links?: string[];
}

export class CopilotLinkResultDto {
  @ApiProperty()
  url!: string;

  @ApiPropertyOptional({
    enum: ['picture', 'page'],
    description: 'What the link turned out to be (absent when it could not be read)',
  })
  kind?: 'picture' | 'page';

  @ApiPropertyOptional({ description: 'The page title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Why the link could not be read, in plain words' })
  error?: string;
}

export class CopilotReplyDto {
  @ApiProperty()
  reply!: string;

  @ApiPropertyOptional({
    description: 'A ready-to-use Image Studio prompt, when the user asked for a picture to be made',
  })
  imagePrompt?: string;

  @ApiPropertyOptional({
    enum: IMAGE_ASPECT_RATIOS,
    description: "The shape nearest to the shared picture's own",
  })
  imageAspectRatio?: ImageAspectRatio;

  @ApiPropertyOptional({
    type: [CopilotLinkResultDto],
    description: 'What happened to each link that was sent',
  })
  links?: CopilotLinkResultDto[];
}
