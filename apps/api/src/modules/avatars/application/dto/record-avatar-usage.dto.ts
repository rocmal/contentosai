import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RecordAvatarUsageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  videoId?: string;
}
