import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { VIDEO_PROVIDER_NAMES } from './generate-video.dto';

export class JobStatusQueryDto {
  @ApiProperty({ enum: VIDEO_PROVIDER_NAMES })
  @IsIn(VIDEO_PROVIDER_NAMES)
  provider!: (typeof VIDEO_PROVIDER_NAMES)[number];
}
