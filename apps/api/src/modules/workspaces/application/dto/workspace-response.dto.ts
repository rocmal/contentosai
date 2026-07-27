import { ApiProperty } from '@nestjs/swagger';
import { Workspace, WorkspaceStatus } from '../../domain/entities/workspace.entity';

export class WorkspaceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ enum: WorkspaceStatus }) status: WorkspaceStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(workspace: Workspace) {
    this.id = workspace.id;
    this.organizationId = workspace.organizationId;
    this.name = workspace.name;
    this.slug = workspace.slug;
    this.description = workspace.description;
    this.status = workspace.status;
    this.createdAt = workspace.createdAt;
    this.updatedAt = workspace.updatedAt;
  }
}
