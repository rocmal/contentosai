import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  SOCIAL_PLATFORMS,
  SocialPlatform,
  VIDEO_VISIBILITIES,
  VideoVisibility,
  YOUTUBE_TITLE_LIMIT,
} from '../../domain/post-media';

/** A post written in the composer: text, optionally one Gallery image or video, to one or more accounts. */
export class CreateSocialPostDto {
  @ApiProperty({ description: 'The post text, hashtags included', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({ description: 'A Gallery image or video of your workspace to attach' })
  @IsOptional()
  @IsUUID('4')
  mediaAssetId?: string;

  @ApiProperty({ enum: SOCIAL_PLATFORMS, isArray: true, example: ['linkedin'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SOCIAL_PLATFORMS.length)
  @ArrayUnique()
  @IsIn(SOCIAL_PLATFORMS, { each: true })
  platforms!: SocialPlatform[];

  @ApiPropertyOptional({ description: 'When to post; leave out to post now' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description:
      "The post's title - YouTube's video title (required there); defaults to the text's first line",
    maxLength: YOUTUBE_TITLE_LIMIT,
  })
  @IsOptional()
  @IsString()
  @MaxLength(YOUTUBE_TITLE_LIMIT)
  title?: string;

  @ApiPropertyOptional({
    enum: VIDEO_VISIBILITIES,
    description: 'YouTube only; public when left out',
  })
  @IsOptional()
  @IsIn(VIDEO_VISIBILITIES)
  visibility?: VideoVisibility;
}
