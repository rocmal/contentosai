import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
  VoiceInfo,
} from '../../domain/interfaces/voice-provider.interface';

interface CartesiaVoice {
  id: string;
  name: string;
  language?: string;
  gender?: string;
}

@Injectable()
export class CartesiaProvider implements IVoiceProvider {
  readonly name = 'cartesia';
  private readonly defaultModel = 'sonic-english';
  private readonly defaultVoiceId = 'a0e99841-438c-4a64-b679-ae501e7d6091';
  private readonly apiVersion = '2024-06-10';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.voice.cartesia.apiKey') ?? '';
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Cartesia voice generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const voiceId = request.voiceId ?? this.defaultVoiceId;

    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'Cartesia-Version': this.apiVersion,
      },
      body: JSON.stringify({
        model_id: model,
        transcript: request.text,
        voice: { mode: 'id', id: voiceId },
        output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Cartesia request failed (${response.status})`);
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

    const response = await fetch('https://api.cartesia.ai/voices', {
      headers: { 'X-API-Key': this.apiKey, 'Cartesia-Version': this.apiVersion },
    });
    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as CartesiaVoice[];
    return body.map((voice) => ({
      id: voice.id,
      name: voice.name,
      locale: voice.language,
      gender: voice.gender,
    }));
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }
}
