import { ApiProperty } from '@nestjs/swagger';
import { CustomVoice } from '../../domain/entities/custom-voice.entity';

export class CustomVoiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'elevenlabs' }) provider: string;
  @ApiProperty({
    nullable: true,
    description:
      'Pass this as voiceId (with this provider) when generating speech. Null while the voice is only a saved recording.',
  })
  voiceId: string | null;
  @ApiProperty({
    description: 'True when this voice can speak new text; false for a saved recording only',
  })
  cloned: boolean;
  @ApiProperty({ nullable: true, description: 'Where the original recording can be played' })
  sampleUrl: string | null;
  @ApiProperty() createdAt: Date;

  constructor(voice: CustomVoice, sampleUrl: string | null = null) {
    this.id = voice.id;
    this.name = voice.name;
    this.provider = voice.provider;
    this.voiceId = voice.providerVoiceId;
    this.cloned = !!voice.providerVoiceId;
    this.sampleUrl = sampleUrl;
    this.createdAt = voice.createdAt;
  }
}
