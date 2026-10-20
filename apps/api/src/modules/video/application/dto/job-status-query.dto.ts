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

/**
 * The status check with the job id in the query string. Veo job ids contain slashes
 * ("models/veo-3.1-fast-generate-preview/operations/..."); in the path they become %2F, which the live
 * server's Apache does not pass to the API, so the browser got the website's HTML back and waited forever.
 */
export class JobStatusByIdQueryDto extends JobStatusQueryDto {
  @ApiProperty({ example: 'models/veo-3.1-fast-generate-preview/operations/abc123' })
  // Letters, digits and . _ - / only, and never "..": the id ends up in the provider's address.
  @Matches(/^(?!.*\.\.)[\w./-]{1,300}$/)
  jobId!: string;
}
