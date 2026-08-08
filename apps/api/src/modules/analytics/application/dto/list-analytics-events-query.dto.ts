import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class ListAnalyticsEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  workspaceId?: string;
}
