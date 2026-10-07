import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Optional details sent with a gallery upload, so a saved creation keeps what it was made from. */
export class UploadMediaMetaDto {
  @ApiPropertyOptional({ description: 'The prompt or text the item was made from' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @ApiPropertyOptional({ example: 'openai' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9._-]+$/i, { message: 'provider must be a short name like "openai"' })
  provider?: string;

  @ApiPropertyOptional({ example: 'gpt-image-2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
