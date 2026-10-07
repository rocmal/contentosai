import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceCloneRequest,
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
  private readonly logger = new Logger(ElevenLabsProvider.name);
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

  /** Instant voice cloning: uploads the recording and returns the new voice's id. */
  async cloneVoice(request: VoiceCloneRequest): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('ElevenLabs voice cloning is not configured');
    }

    const form = new FormData();
    form.append('name', request.name);
    form.append('description', 'Recorded in Lumora Voice Studio');
    form.append('remove_background_noise', 'true');
    form.append(
      'files',
      new Blob([new Uint8Array(request.audio)], { type: request.mimeType || 'audio/webm' }),
      'sample.webm',
    );

    let response: Response;
    try {
      response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 'xi-api-key': this.apiKey },
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ServiceUnavailableException('The voice service did not respond. Please try again.');
    }

    if (!response.ok) {
      // The vendor's wording is for the operator, not the customer.
      this.logger.error(`ElevenLabs voice clone failed (${response.status})`);
      if (response.status === 400 || response.status === 422) {
        throw new BadRequestException(
          'This recording could not be used. Record at least 30 seconds of clear speech in a quiet room and try again.',
        );
      }
      throw new ServiceUnavailableException(
        'Voice cloning is not available right now (the voice service plan may not include it).',
      );
    }

    const body = (await response.json()) as { voice_id?: string };
    if (!body.voice_id) {
      throw new ServiceUnavailableException(
        'The voice service returned no voice. Please try again.',
      );
    }
    return body.voice_id;
  }

  async deleteVoice(voiceId: string): Promise<void> {
    if (!this.apiKey) return;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      {
        method: 'DELETE',
        headers: { 'xi-api-key': this.apiKey },
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`ElevenLabs voice delete failed (${response.status})`);
    }
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
