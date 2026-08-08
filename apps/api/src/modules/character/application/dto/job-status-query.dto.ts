import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CHARACTER_PROVIDER_NAMES } from './generate-character.dto';

export class JobStatusQueryDto {
  @ApiProperty({ enum: CHARACTER_PROVIDER_NAMES })
  @IsIn(CHARACTER_PROVIDER_NAMES)
  provider!: (typeof CHARACTER_PROVIDER_NAMES)[number];
}
