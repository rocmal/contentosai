import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
} from '../../domain/interfaces/voice-provider.interface';

@Injectable()
export class ElevenLabsProvider implements IVoiceProvider {
  readonly name = 'elevenlabs';
  private readonly defaultModel = 'eleven_multilingual_v2';
  private readonly defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';

  constructor(private readonly configService: ConfigService) {}

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    const apiKey = this.configService.get<string>('ai.voice.elevenlabs.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('ElevenLabs voice generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const voiceId = request.voiceId ?? this.defaultVoiceId;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({ text: request.text, model_id: model }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`ElevenLabs request failed (${response.status})`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      provider: this.name,
      model,
      mimeType: 'audio/mpeg',
      audioBase64: audioBuffer.toString('base64'),
    };
  }
}
