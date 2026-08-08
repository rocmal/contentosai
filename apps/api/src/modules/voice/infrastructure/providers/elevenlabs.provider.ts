import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
  VoiceInfo,
} from '../../domain/interfaces/voice-provider.interface';

interface ElevenLabsVoicesResponse {
  voices: { voice_id: string; name: string; labels?: Record<string, string> }[];
}

@Injectable()
export class ElevenLabsProvider implements IVoiceProvider {
  readonly name = 'elevenlabs';
  private readonly defaultModel = 'eleven_multilingual_v2';
  private readonly defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.voice.elevenlabs.apiKey') ?? '';
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('ElevenLabs voice generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const voiceId = request.voiceId ?? this.defaultVoiceId;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': this.apiKey,
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

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.apiKey) {
      return [];
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': this.apiKey },
    });
    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as ElevenLabsVoicesResponse;
    return body.voices.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      locale: voice.labels?.language,
      gender: voice.labels?.gender,
    }));
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }
}
