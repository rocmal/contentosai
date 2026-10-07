import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreditUsageQueryDto {
  @ApiPropertyOptional({
    default: 30,
    minimum: 1,
    maximum: 365,
    description: 'Look-back window in days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
