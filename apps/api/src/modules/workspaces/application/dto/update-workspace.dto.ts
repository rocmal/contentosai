import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { WorkspaceStatus } from '../../domain/entities/workspace.entity';

export class UpdateWorkspaceDto extends PartialType(
  OmitType(CreateWorkspaceDto, ['organizationId', 'slug'] as const),
) {
  @ApiPropertyOptional({ enum: WorkspaceStatus })
  @IsOptional()
  @IsEnum(WorkspaceStatus)
  status?: WorkspaceStatus;
}
