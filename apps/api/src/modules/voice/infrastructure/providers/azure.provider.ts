import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
  VoiceInfo,
} from '../../domain/interfaces/voice-provider.interface';

interface AzureVoice {
  ShortName: string;
  DisplayName: string;
  Locale: string;
  Gender: string;
}

@Injectable()
export class AzureProvider implements IVoiceProvider {
  readonly name = 'azure';
  private readonly defaultVoice = 'en-US-JennyNeural';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.voice.azure.apiKey') ?? '';
  }

  private get region(): string {
    return this.configService.get<string>('ai.voice.azure.region') ?? 'eastus';
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    const apiKey = this.apiKey;
    const region = this.region;
    if (!apiKey) {
      throw new ServiceUnavailableException('Azure voice generation is not configured');
    }

    const voice = request.voiceId ?? this.defaultVoice;
    const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${voice}">${this.escapeSsml(request.text)}</voice></speak>`;

    const response = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'Ocp-Apim-Subscription-Key': apiKey,
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      },
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(`Azure Speech request failed (${response.status})`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      provider: this.name,
      model: voice,
      mimeType: 'audio/mpeg',
      audioBase64: audioBuffer.toString('base64'),
    };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.apiKey) {
      return [];
    }

    const response = await fetch(
      `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      { headers: { 'Ocp-Apim-Subscription-Key': this.apiKey } },
    );
    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as AzureVoice[];
    return body.map((voice) => ({
      id: voice.ShortName,
      name: voice.DisplayName,
      locale: voice.Locale,
      gender: voice.Gender,
    }));
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }

  private escapeSsml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
