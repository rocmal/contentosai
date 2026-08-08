import { ApiProperty } from '@nestjs/swagger';
import { MediaAsset, MediaAssetType } from '../../domain/entities/media-asset.entity';

export class MediaAssetResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() fileName: string;
  @ApiProperty() storageKey: string;
  @ApiProperty() url: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty({ enum: MediaAssetType }) type: MediaAssetType;
  @ApiProperty({ nullable: true }) prompt: string | null;
  @ApiProperty({ nullable: true }) provider: string | null;
  @ApiProperty({ nullable: true }) model: string | null;
  @ApiProperty({ nullable: true }) voiceId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(mediaAsset: MediaAsset) {
    this.id = mediaAsset.id;
    this.organizationId = mediaAsset.organizationId;
    this.workspaceId = mediaAsset.workspaceId;
    this.fileName = mediaAsset.fileName;
    this.storageKey = mediaAsset.storageKey;
    this.url = mediaAsset.url;
    this.mimeType = mediaAsset.mimeType;
    this.sizeBytes = mediaAsset.sizeBytes;
    this.type = mediaAsset.type;
    this.prompt = mediaAsset.prompt;
    this.provider = mediaAsset.provider;
    this.model = mediaAsset.model;
    this.voiceId = mediaAsset.voiceId;
    this.createdAt = mediaAsset.createdAt;
    this.updatedAt = mediaAsset.updatedAt;
  }
}
