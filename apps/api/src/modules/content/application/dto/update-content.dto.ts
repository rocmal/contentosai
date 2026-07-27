import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateContentDto } from './create-content.dto';
import { ContentStatus } from '../../domain/entities/content.entity';

export class UpdateContentDto extends PartialType(
  OmitType(CreateContentDto, ['organizationId', 'workspaceId'] as const),
) {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
