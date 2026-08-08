import { ApiProperty } from '@nestjs/swagger';
import {
  VoiceTemplate,
  VoiceTemplateVisibility,
} from '../../domain/entities/voice-template.entity';

export class VoiceTemplateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() name: string;
  @ApiProperty() provider: string;
  @ApiProperty() voiceId: string;
  @ApiProperty() language: string;
  @ApiProperty({ enum: VoiceTemplateVisibility }) visibility: VoiceTemplateVisibility;
  @ApiProperty({ nullable: true }) createdBy: string | null;
  @ApiProperty() createdAt: Date;

  constructor(voiceTemplate: VoiceTemplate) {
    this.id = voiceTemplate.id;
    this.organizationId = voiceTemplate.organizationId;
    this.workspaceId = voiceTemplate.workspaceId;
    this.name = voiceTemplate.name;
    this.provider = voiceTemplate.provider;
    this.voiceId = voiceTemplate.voiceId;
    this.language = voiceTemplate.language;
    this.visibility = voiceTemplate.visibility;
    this.createdBy = voiceTemplate.createdBy;
    this.createdAt = voiceTemplate.createdAt;
  }
}
