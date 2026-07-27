import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpsertSettingDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  value?: unknown;
}
