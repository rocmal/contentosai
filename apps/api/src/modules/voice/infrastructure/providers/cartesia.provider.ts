import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
} from '../../domain/interfaces/voice-provider.interface';

@Injectable()
export class CartesiaProvider implements IVoiceProvider {
  readonly name = 'cartesia';
  private readonly defaultModel = 'sonic-english';
  private readonly defaultVoiceId = 'a0e99841-438c-4a64-b679-ae501e7d6091';
  private readonly apiVersion = '2024-06-10';

  constructor(private readonly configService: ConfigService) {}

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    const apiKey = this.configService.get<string>('ai.voice.cartesia.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('Cartesia voice generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const voiceId = request.voiceId ?? this.defaultVoiceId;

    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
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
}
