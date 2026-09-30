import { ApiProperty } from '@nestjs/swagger';
import { Project, ProjectStatus } from '../../domain/entities/project.entity';

export class ProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty({ nullable: true }) campaignId: string | null;
  @ApiProperty() title: string;
  @ApiProperty() category: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ enum: ProjectStatus }) status: ProjectStatus;
  @ApiProperty({ description: 'Content items linked to this project' }) contentCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(project: Project, contentCount = 0) {
    this.id = project.id;
    this.organizationId = project.organizationId;
    this.workspaceId = project.workspaceId;
    this.campaignId = project.campaignId;
    this.title = project.title;
    this.category = project.category;
    this.description = project.description;
    this.status = project.status;
    this.contentCount = contentCount;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;
  }
}
