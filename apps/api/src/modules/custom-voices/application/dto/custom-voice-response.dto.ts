import { ApiProperty } from '@nestjs/swagger';
import { CustomVoice } from '../../domain/entities/custom-voice.entity';

export class CustomVoiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'elevenlabs' }) provider: string;
  @ApiProperty({ description: 'Pass this as voiceId (with this provider) when generating speech' })
  voiceId: string;
  @ApiProperty() createdAt: Date;

  constructor(voice: CustomVoice) {
    this.id = voice.id;
    this.name = voice.name;
    this.provider = voice.provider;
    this.voiceId = voice.providerVoiceId;
    this.createdAt = voice.createdAt;
  }
}
