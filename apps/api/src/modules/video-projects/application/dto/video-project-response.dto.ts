import { ApiProperty } from '@nestjs/swagger';
import {
  VideoProject,
  VideoProjectScene,
  VideoProjectSource,
  VideoProjectStatus,
} from '../../domain/entities/video-project.entity';

export class VideoProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: VideoProjectSource }) source: VideoProjectSource;
  @ApiProperty({ enum: VideoProjectStatus }) status: VideoProjectStatus;
  @ApiProperty() scenes: VideoProjectScene[];
  @ApiProperty() aspectRatio: string;
  @ApiProperty() transition: string;
  @ApiProperty({ nullable: true }) narrationText: string | null;
  @ApiProperty({ nullable: true }) narrationVoiceId: string | null;
  @ApiProperty({ nullable: true }) narrationGender: string | null;
  @ApiProperty({ nullable: true }) narrationLanguage: string | null;
  @ApiProperty({ nullable: true }) finalAssetId: string | null;
  @ApiProperty({ nullable: true }) createdBy: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(project: VideoProject) {
    this.id = project.id;
    this.organizationId = project.organizationId;
    this.workspaceId = project.workspaceId;
    this.title = project.title;
    this.source = project.source;
    this.status = project.status;
    this.scenes = project.scenes;
    this.aspectRatio = project.aspectRatio;
    this.transition = project.transition;
    this.narrationText = project.narrationText;
    this.narrationVoiceId = project.narrationVoiceId;
    this.narrationGender = project.narrationGender;
    this.narrationLanguage = project.narrationLanguage;
    this.finalAssetId = project.finalAssetId;
    this.createdBy = project.createdBy;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;
  }
}
