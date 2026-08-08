import { ApiProperty } from '@nestjs/swagger';
import { PublishingJob, PublishingJobStatus } from '../../domain/entities/publishing-job.entity';

export class PublishingJobResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty({ nullable: true }) contentId: string | null;
  @ApiProperty() platform: string;
  @ApiProperty({ enum: PublishingJobStatus }) status: PublishingJobStatus;
  @ApiProperty({ nullable: true }) scheduledAt: Date | null;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;
  @ApiProperty({ nullable: true }) externalPostId: string | null;
  @ApiProperty({ nullable: true }) permalink: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(publishingJob: PublishingJob) {
    this.id = publishingJob.id;
    this.organizationId = publishingJob.organizationId;
    this.workspaceId = publishingJob.workspaceId;
    this.contentId = publishingJob.contentId;
    this.platform = publishingJob.platform;
    this.status = publishingJob.status;
    this.scheduledAt = publishingJob.scheduledAt;
    this.publishedAt = publishingJob.publishedAt;
    this.externalPostId = publishingJob.externalPostId;
    this.permalink = publishingJob.permalink;
    this.createdAt = publishingJob.createdAt;
    this.updatedAt = publishingJob.updatedAt;
  }
}
