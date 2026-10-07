import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { VIDEO_PROVIDER_NAMES } from './generate-video.dto';

export class JobStatusQueryDto {
  @ApiProperty({ enum: VIDEO_PROVIDER_NAMES })
  @IsIn(VIDEO_PROVIDER_NAMES)
  provider!: (typeof VIDEO_PROVIDER_NAMES)[number];

  @ApiPropertyOptional({ description: 'cacheKey returned when the job was submitted' })
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  cacheKey?: string;
}
