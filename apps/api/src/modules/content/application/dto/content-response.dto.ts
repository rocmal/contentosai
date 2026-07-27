import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Content, ContentStatus, ContentType } from '../../domain/entities/content.entity';

export class ContentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty({ nullable: true }) campaignId: string | null;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ enum: ContentType }) type: ContentType;
  @ApiProperty({ enum: ContentStatus }) status: ContentStatus;
  @ApiProperty() aiGenerated: boolean;
  @ApiProperty({ nullable: true }) aiProvider: string | null;
  @ApiPropertyOptional({ type: Object, nullable: true }) metadata: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(content: Content) {
    this.id = content.id;
    this.organizationId = content.organizationId;
    this.workspaceId = content.workspaceId;
    this.campaignId = content.campaignId;
    this.title = content.title;
    this.body = content.body;
    this.type = content.type;
    this.status = content.status;
    this.aiGenerated = content.aiGenerated;
    this.aiProvider = content.aiProvider;
    this.metadata = content.metadata;
    this.createdAt = content.createdAt;
    this.updatedAt = content.updatedAt;
  }
}
