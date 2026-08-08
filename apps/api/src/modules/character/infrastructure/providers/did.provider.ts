import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
  ICharacterProvider,
} from '../../domain/interfaces/character-provider.interface';

interface DidTalkResponse {
  id: string;
  status?: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
  error?: { message?: string };
}

const DID_API_BASE = 'https://api.d-id.com';
const DEFAULT_VOICE_ID = 'en-US-JennyNeural';

@Injectable()
export class DidProvider implements ICharacterProvider {
  readonly name = 'did';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.character.did.apiKey') ?? '';
  }

  // D-ID issues API keys already shaped for HTTP Basic auth (base64 of the
  // whole key string) - confirm this still matches D-ID's current docs once
  // a real key is on hand; this is the one part of this integration that
  // couldn't be verified against a live account.
  private authHeader(): string {
    return `Basic ${Buffer.from(this.apiKey).toString('base64')}`;
  }

  // D-ID's /talks endpoint needs a source_url it can fetch itself, so a
  // localhost URL (SadTalker/Wav2Lip-style local storage) never works -
  // uploading the bytes to D-ID's own asset host first sidesteps needing a
  // public tunnel for every source image.
  private async hostImageOnDid(sourceImageUrl: string): Promise<string> {
    const imageResponse = await fetch(sourceImageUrl);
    if (!imageResponse.ok) {
      throw new ServiceUnavailableException(`Could not fetch source image (${imageResponse.status})`);
    }
    const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg';
    const bytes = await imageResponse.arrayBuffer();

    const form = new FormData();
    form.append('image', new Blob([bytes], { type: contentType }), 'source.jpg');

    const uploadResponse = await fetch(`${DID_API_BASE}/images`, {
      method: 'POST',
      headers: { Authorization: this.authHeader() },
      body: form,
    });
    if (!uploadResponse.ok) {
      const body = await uploadResponse.text().catch(() => '');
      throw new ServiceUnavailableException(`D-ID image upload failed (${uploadResponse.status}): ${body.slice(0, 300)}`);
    }
    const uploaded = (await uploadResponse.json()) as { url?: string };
    if (!uploaded.url) {
      throw new ServiceUnavailableException('D-ID image upload did not return a url');
    }
    return uploaded.url;
  }

  async submitJob(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('D-ID character video generation is not configured');
    }

    const sourceUrl = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(request.sourceImageUrl)
      ? await this.hostImageOnDid(request.sourceImageUrl)
      : request.sourceImageUrl;

    const response = await fetch(`${DID_API_BASE}/talks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
      },
      body: JSON.stringify({
        source_url: sourceUrl,
        script: {
          type: 'text',
          input: request.script,
          provider: { type: 'microsoft', voice_id: request.voiceId ?? DEFAULT_VOICE_ID },
        },
        config: { fluent: true },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceUnavailableException(`D-ID request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const body = (await response.json()) as DidTalkResponse;
    return { provider: this.name, jobId: body.id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<CharacterGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('D-ID character video generation is not configured');
    }

    const response = await fetch(`${DID_API_BASE}/talks/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: this.authHeader() },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`D-ID status check failed (${response.status})`);
    }

    const body = (await response.json()) as DidTalkResponse;
    if (body.status === 'error') {
      return { provider: this.name, jobId, status: 'failed' };
    }

    return {
      provider: this.name,
      jobId,
      status: body.status === 'done' ? 'completed' : 'processing',
      videoUrl: body.result_url,
    };
  }
}
