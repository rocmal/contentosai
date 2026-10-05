import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const TRANSCRIBE_LANGUAGES = ['auto', 'hi-IN', 'pa-IN', 'en-IN'] as const;
export type TranscribeLanguage = (typeof TRANSCRIBE_LANGUAGES)[number];

export interface TranscriptionResult {
  text: string;
  /** Language Sarvam heard, e.g. "hi-IN" (empty if it did not say). */
  language: string;
}

interface SarvamSttResponse {
  transcript?: string;
  language_code?: string | null;
}

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const TIMEOUT_MS = 30_000;

/**
 * Speech-to-text for dictating prompts. Sarvam understands Hindi, Punjabi and
 * Indian English (and code-mixing) far better than a generic engine, and the
 * one Sarvam key already covers text and voice.
 */
@Injectable()
export class TranscriptionService {
  constructor(private readonly configService: ConfigService) {}

  async transcribe(audio: Buffer, mimeType: string, language: TranscribeLanguage = 'auto'): Promise<TranscriptionResult> {
    const apiKey = this.configService.get<string>('ai.sarvam.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException('Voice typing is not set up on this server (Sarvam key missing).');
    }
    if (!audio.length) {
      throw new BadRequestException('No audio was received.');
    }

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType || 'audio/webm' }), 'speech.webm');
    form.append('language_code', language === 'auto' ? 'unknown' : language);

    let response: Response;
    try {
      response = await fetch(SARVAM_STT_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': apiKey },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException('The speech service did not respond in time. Please try again.');
    }

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new BadRequestException('Could not read that recording. Try speaking again, a little longer.');
      }
      throw new BadGatewayException('The speech service is busy. Please try again.');
    }

    const body = (await response.json()) as SarvamSttResponse;
    const text = (body.transcript ?? '').trim();
    if (!text) {
      throw new BadRequestException('No speech was detected. Check your microphone and try again.');
    }
    return { text, language: body.language_code ?? '' };
  }
}
