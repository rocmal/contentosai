import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
  VoiceInfo,
} from '../../domain/interfaces/voice-provider.interface';

interface SarvamTTSResponse {
  request_id: string;
  audios: string[];
}

// Sarvam has no "list voices" endpoint - this mirrors the fixed speaker
// rosters documented at https://docs.sarvam.ai (text-to-speech). Confirmed
// live 2026-08-09: every voice below returns real audio (HTTP 200) for both
// hi-IN and en-IN via /text-to-speech.
//
// bulbul:v2 was retired by Sarvam (2026-10); its speakers are mapped to a v3
// speaker below so old saved choices keep working.
const V2_SPEAKER_REPLACEMENTS: Record<string, string> = {
  anushka: 'priya',
  manisha: 'priya',
  vidya: 'priya',
  arya: 'priya',
  abhilash: 'shubh',
  karun: 'shubh',
  hitesh: 'shubh',
};

const SARVAM_VOICES: VoiceInfo[] = [
  // bulbul:v3 - full documented roster, gender not documented by Sarvam so
  // left unset rather than guessed.
  { id: 'shubh', name: 'Shubh' },
  { id: 'aditya', name: 'Aditya' },
  { id: 'ritu', name: 'Ritu' },
  { id: 'priya', name: 'Priya' },
  { id: 'neha', name: 'Neha' },
  { id: 'rahul', name: 'Rahul' },
  { id: 'pooja', name: 'Pooja' },
  { id: 'rohan', name: 'Rohan' },
  { id: 'simran', name: 'Simran' },
  { id: 'kavya', name: 'Kavya' },
  { id: 'amit', name: 'Amit' },
  { id: 'dev', name: 'Dev' },
  { id: 'ishita', name: 'Ishita' },
  { id: 'shreya', name: 'Shreya' },
  { id: 'ratan', name: 'Ratan' },
  { id: 'varun', name: 'Varun' },
  { id: 'manan', name: 'Manan' },
  { id: 'sumit', name: 'Sumit' },
  { id: 'roopa', name: 'Roopa' },
  { id: 'kabir', name: 'Kabir' },
  { id: 'aayan', name: 'Aayan' },
  { id: 'ashutosh', name: 'Ashutosh' },
  { id: 'advait', name: 'Advait' },
  { id: 'anand', name: 'Anand' },
  { id: 'tanya', name: 'Tanya' },
  { id: 'tarun', name: 'Tarun' },
  { id: 'sunny', name: 'Sunny' },
  { id: 'mani', name: 'Mani' },
  { id: 'gokul', name: 'Gokul' },
  { id: 'vijay', name: 'Vijay' },
  { id: 'shruti', name: 'Shruti' },
  { id: 'suhani', name: 'Suhani' },
  { id: 'mohit', name: 'Mohit' },
  { id: 'kavitha', name: 'Kavitha' },
  { id: 'rehan', name: 'Rehan' },
  { id: 'soham', name: 'Soham' },
  { id: 'rupali', name: 'Rupali' },
];

/**
 * Sarvam's TTS (Bulbul v3) covers 11 Indian languages with 30+ voices - the
 * only voice provider in this app with native Indic-language support. Its
 * response already returns base64 audio directly, matching
 * VoiceGenerationResult's shape with no byte->base64 conversion needed
 * (unlike Cartesia/ElevenLabs, which return raw audio bytes).
 */
@Injectable()
export class SarvamVoiceProvider implements IVoiceProvider {
  readonly name = 'sarvam';
  private readonly logger = new Logger(SarvamVoiceProvider.name);
  private readonly defaultModel = 'bulbul:v3';
  private readonly defaultVoiceId = 'shubh';
  private readonly defaultLanguageCode = 'hi-IN';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.voice.sarvam.apiKey') ?? '';
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Sarvam voice generation is not configured');
    }

    // Sarvam retired bulbul:v2 and its speakers; older clients and saved
    // choices may still send it, so always use v3.
    const model = !request.model || request.model === 'bulbul:v2' ? this.defaultModel : request.model;
    const speaker = V2_SPEAKER_REPLACEMENTS[request.voiceId ?? ''] ?? request.voiceId ?? this.defaultVoiceId;

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': this.apiKey,
      },
      body: JSON.stringify({
        text: request.text,
        language_code: request.languageCode ?? this.defaultLanguageCode,
        speaker,
        model,
      }),
    });

    if (!response.ok) {
      // Log Sarvam's detail for us; the customer gets a plain message without vendor text.
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      this.logger.error(`Sarvam TTS request failed (${response.status}): ${detail}`);
      throw new ServiceUnavailableException(sarvamFailureMessage(response.status));
    }

    const body = (await response.json()) as SarvamTTSResponse;
    const audioBase64 = body.audios[0];
    if (!audioBase64) {
      throw new ServiceUnavailableException('Sarvam TTS returned no audio');
    }

    return {
      provider: this.name,
      model,
      // Matches the API's output_audio_codec default ("wav") - override
      // there and here together if that default is ever changed.
      mimeType: 'audio/wav',
      audioBase64,
    };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return this.apiKey ? SARVAM_VOICES : [];
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/** What a customer reads when Sarvam refuses to voice a script. */
export function sarvamFailureMessage(status: number): string {
  if (status === 400 || status === 422) {
    return 'This script could not be voiced. Check that it is written in the chosen language, then try again.';
  }
  if (status === 429) {
    return 'Voice generation is busy right now. Please try again in a few minutes.';
  }
  return 'Voice generation is temporarily unavailable on our side. Please try again later.';
}
