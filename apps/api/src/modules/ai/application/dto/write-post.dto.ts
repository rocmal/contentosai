import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { POST_PLATFORMS, PostPlatform } from '../post-writer/post-prompt';

/** "Write with AI" in the post composer. */
export class WritePostDto {
  @ApiProperty({ enum: POST_PLATFORMS, example: 'linkedin' })
  @IsIn(POST_PLATFORMS)
  platform!: PostPlatform;

  @ApiPropertyOptional({
    description:
      'What the person has typed so far: a finished post to improve, or a short note to follow',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  draft?: string;

  @ApiPropertyOptional({ description: 'What the attached picture or video was made from' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  topic?: string;

  @ApiPropertyOptional({
    description:
      'The Gallery image or video going with the post. An image is read by the AI; a video is not (its prompt is used).',
  })
  @IsOptional()
  @IsUUID('4')
  mediaAssetId?: string;
}

export class WritePostResultDto {
  @ApiProperty({ description: 'The post, hashtags on the last line' })
  text!: string;

  @ApiProperty({ description: 'True when the AI looked at the attached picture' })
  readPicture!: boolean;
}
