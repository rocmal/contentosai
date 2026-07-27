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
    this.createdAt = mediaAsset.createdAt;
    this.updatedAt = mediaAsset.updatedAt;
  }
}
