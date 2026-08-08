import { ApiProperty } from '@nestjs/swagger';
import {
  VideoTemplate,
  VideoTemplateVisibility,
} from '../../domain/entities/video-template.entity';

export class VideoTemplateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() title: string;
  @ApiProperty() videoUrl: string;
  @ApiProperty({ nullable: true }) thumbnailUrl: string | null;
  @ApiProperty() aspectRatio: string;
  @ApiProperty({ nullable: true }) durationSeconds: number | null;
  @ApiProperty({ enum: VideoTemplateVisibility }) visibility: VideoTemplateVisibility;
  @ApiProperty({ nullable: true }) createdBy: string | null;
  @ApiProperty() createdAt: Date;

  constructor(videoTemplate: VideoTemplate) {
    this.id = videoTemplate.id;
    this.organizationId = videoTemplate.organizationId;
    this.workspaceId = videoTemplate.workspaceId;
    this.title = videoTemplate.title;
    this.videoUrl = videoTemplate.videoUrl;
    this.thumbnailUrl = videoTemplate.thumbnailUrl;
    this.aspectRatio = videoTemplate.aspectRatio;
    this.durationSeconds = videoTemplate.durationSeconds;
    this.visibility = videoTemplate.visibility;
    this.createdBy = videoTemplate.createdBy;
    this.createdAt = videoTemplate.createdAt;
  }
}
