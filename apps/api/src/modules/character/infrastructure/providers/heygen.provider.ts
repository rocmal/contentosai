import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
  ICharacterProvider,
} from '../../domain/interfaces/character-provider.interface';

interface HeyGenErrorResponse {
  error?: { message?: string } | string;
  message?: string;
}

interface HeyGenUploadResponse extends HeyGenErrorResponse {
  data?: { talking_photo_id?: string; image_key?: string };
}

interface HeyGenGenerateResponse extends HeyGenErrorResponse {
  data?: { video_id?: string };
}

interface HeyGenStatusResponse extends HeyGenErrorResponse {
  data?: {
    status?: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed';
    video_url?: string;
    error?: { message?: string };
  };
}

const HEYGEN_UPLOAD_BASE = 'https://upload.heygen.com';
const HEYGEN_API_BASE = 'https://api.heygen.com';
// HeyGen's voice catalog uses its own ids, not the Azure/edge-style
// "en-US-JennyNeural" names used elsewhere in Character Studio - unverified
// against a live account, kept as a documented gap rather than guessed at.
const DEFAULT_VOICE_ID = '';

/**
 * D-ID-equivalent for HeyGen's "talking photo" product: upload a portrait,
 * then generate a video where it speaks the given script via HeyGen's own
 * text-to-speech. Built to HeyGen's documented API shape without a live
 * account to verify against (same caveat as the D-ID auth-header format) -
 * treat the first real generation as the integration test.
 */
@Injectable()
export class HeyGenProvider implements ICharacterProvider {
  readonly name = 'heygen';
  private readonly logger = new Logger(HeyGenProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.character.heygen.apiKey') ?? '';
  }

  async submitJob(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('HeyGen character video generation is not configured');
    }

    const talkingPhotoId = await this.uploadPhoto(request.sourceImageUrl);

    const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'talking_photo', talking_photo_id: talkingPhotoId },
            voice: {
              type: 'text',
              input_text: request.script,
              ...(request.voiceId ? { voice_id: request.voiceId } : DEFAULT_VOICE_ID ? { voice_id: DEFAULT_VOICE_ID } : {}),
            },
          },
        ],
        dimension: { width: 720, height: 720 },
      }),
    });

    const body = (await response.json()) as HeyGenGenerateResponse;
    if (!response.ok || !body.data?.video_id) {
      throw new ServiceUnavailableException(`HeyGen request failed (${response.status}): ${this.errorText(body)}`);
    }

    return { provider: this.name, jobId: body.data.video_id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<CharacterGenerationResult> {
    const response = await fetch(`${HEYGEN_API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`, {
      headers: { 'X-Api-Key': this.apiKey },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`HeyGen status check failed (${response.status})`);
    }

    const body = (await response.json()) as HeyGenStatusResponse;
    if (body.data?.status === 'failed') {
      this.logger.warn(`HeyGen job ${jobId} failed: ${body.data.error?.message ?? 'unknown reason'}`);
      return { provider: this.name, jobId, status: 'failed' };
    }

    return {
      provider: this.name,
      jobId,
      status: body.data?.status === 'completed' ? 'completed' : 'processing',
      videoUrl: body.data?.video_url,
    };
  }

  /** HeyGen needs the photo uploaded as its own asset before a video can
   * reference it - unlike D-ID, it won't just fetch an arbitrary URL. */
  private async uploadPhoto(sourceImageUrl: string): Promise<string> {
    const imageResponse = await fetch(sourceImageUrl);
    if (!imageResponse.ok) {
      throw new ServiceUnavailableException(`Could not download source image (${imageResponse.status})`);
    }
    const contentType = imageResponse.headers.get('content-type') ?? 'image/png';
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    const response = await fetch(`${HEYGEN_UPLOAD_BASE}/v1/talking_photo`, {
      method: 'POST',
      headers: { 'Content-Type': contentType, 'X-Api-Key': this.apiKey },
      body: buffer,
    });

    const body = (await response.json()) as HeyGenUploadResponse;
    const talkingPhotoId = body.data?.talking_photo_id ?? body.data?.image_key;
    if (!response.ok || !talkingPhotoId) {
      throw new ServiceUnavailableException(
        `HeyGen photo upload failed (${response.status}): ${this.errorText(body)}`,
      );
    }
    return talkingPhotoId;
  }

  private errorText(body: HeyGenErrorResponse): string {
    if (typeof body.error === 'string') return body.error;
    return body.error?.message ?? body.message ?? 'unknown error';
  }
}
