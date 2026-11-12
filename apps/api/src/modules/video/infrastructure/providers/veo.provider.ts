import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const INTERACTIONS_URL = `${GOOGLE_API_BASE}/interactions`;
/** Google's video model. Veo 3.1 Fast (preview) was shut down on 2026-10-22 and every video failed until this changed;
 * when Google renames it again, set GOOGLE_VIDEO_MODEL instead of changing code. */
export const DEFAULT_GOOGLE_VIDEO_MODEL = 'gemini-omni-1.2-flash';
/** An interaction id as the Interactions API hands it out (e.g. "v1_ChdJ..."): it goes into a Google address sent
 * with our key, so only letters, digits, "_" and "-". */
const INTERACTION_ID = /^[\w-]{1,200}$/;

interface InteractionBlock {
  type: string;
  mime_type?: string;
  data?: string;
  uri?: string;
  text?: string;
}

interface InteractionResponse {
  id: string;
  status?: string;
  steps?: { type: string; content?: InteractionBlock[] }[];
  error?: { message?: string };
}

/** Gemini Omni makes whole seconds from 3 to 15; the app asks for 4, 6 or 8. */
export function videoDurationSeconds(requested?: number): number {
  return Math.min(15, Math.max(3, Math.round(requested ?? 8)));
}

function findVideo(body: InteractionResponse): InteractionBlock | null {
  for (const step of body.steps ?? []) {
    if (step.type !== 'model_output') continue;
    const video = (step.content ?? []).find((block) => block.type === 'video');
    if (video && (video.data || video.uri)) return video;
  }
  return null;
}

/**
 * Google video through the Gemini API, now Gemini Omni Flash (Interactions API). Still named "veo": that is the
 * provider the website and the phone app send, and installed phone apps cannot be changed. Same Google key as Gemini
 * text (VEO_API_KEY only overrides it), paid from the Google AI Studio prepaid credit.
 *
 * A job is a background interaction: submitJob returns its id at once (the live Apache cuts requests at 60 s and a
 * clip takes about a minute), getJobStatus polls it, and fetchVideo reads the finished clip out of the interaction.
 */
@Injectable()
export class VeoProvider implements IVideoProvider {
  readonly name = 'veo';
  private readonly logger = new Logger(VeoProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return (
      this.configService.get<string>('ai.video.veo.apiKey') ||
      this.configService.get<string>('ai.gemini.apiKey') ||
      ''
    );
  }

  private get model(): string {
    return this.configService.get<string>('ai.video.veo.model') || DEFAULT_GOOGLE_VIDEO_MODEL;
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Video generation is not set up on this server yet.');
    }
    // The model is ours to choose: old requests may still name a retired Veo model.
    const model = this.model;

    const response = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        model,
        input: request.prompt,
        response_format: {
          type: 'video',
          aspect_ratio: request.aspectRatio ?? '16:9',
          duration: `${videoDurationSeconds(request.durationSeconds)}s`,
        },
        background: true,
        store: true,
      }),
    });

    if (!response.ok) {
      throw await this.toException(response);
    }

    const body = (await response.json()) as InteractionResponse;
    if (body.error || !body.id) {
      this.logger.error(`Google video request failed: ${body.error?.message ?? 'no interaction id'}`);
      throw new ServiceUnavailableException(
        'Video generation is temporarily unavailable on our side. Please try again later - no credits were used.',
      );
    }
    return { provider: this.name, model, jobId: body.id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    if (!INTERACTION_ID.test(jobId)) {
      throw new BadRequestException('That is not a video job id.');
    }
    const model = this.model;
    const response = await fetch(`${INTERACTIONS_URL}/${jobId}`, {
      headers: { 'x-goog-api-key': this.apiKey },
    });
    if (!response.ok) {
      this.logger.error(`Google video status check failed (${response.status})`);
      throw new ServiceUnavailableException('Could not check the video status. Please try again.');
    }

    const body = (await response.json()) as InteractionResponse;
    if (body.error || body.status === 'failed' || body.status === 'cancelled') {
      this.logger.error(`Google video job failed: ${body.error?.message ?? body.status}`);
      return { provider: this.name, model, jobId, status: 'failed' };
    }
    if (body.status !== 'completed') {
      return { provider: this.name, model, jobId, status: 'processing' };
    }
    if (!findVideo(body)) {
      // Finished without a clip: usually the safety rules declined the prompt; the model says why in text.
      const said = (body.steps ?? [])
        .flatMap((step) => step.content ?? [])
        .map((block) => block.text ?? '')
        .join(' ')
        .slice(0, 300);
      this.logger.warn(`Google video job ${jobId} finished without a video. ${said}`);
      return { provider: this.name, model, jobId, status: 'failed' };
    }
    // The clip is read from the interaction itself when it is saved (fetchVideo).
    return {
      provider: this.name,
      model,
      jobId,
      status: 'completed',
      videoUrl: `${INTERACTIONS_URL}/${jobId}`,
    };
  }

  /** Reads the finished clip: inside the interaction as base64, or at a Google file address that needs our key.
   * The key is only ever sent to Google's own API address. */
  async fetchVideo(url: string): Promise<Response> {
    if (!url.startsWith(`${INTERACTIONS_URL}/`)) {
      throw new BadRequestException('That is not a video address.');
    }
    const response = await fetch(url, { headers: { 'x-goog-api-key': this.apiKey } });
    if (!response.ok) return response;

    const video = findVideo((await response.json()) as InteractionResponse);
    if (video?.data) {
      return new Response(new Uint8Array(Buffer.from(video.data, 'base64')), {
        status: 200,
        headers: { 'content-type': video.mime_type ?? 'video/mp4' },
      });
    }
    if (video?.uri?.startsWith(`${GOOGLE_API_BASE}/`)) {
      return fetch(video.uri, { headers: { 'x-goog-api-key': this.apiKey }, redirect: 'follow' });
    }
    return new Response(null, { status: 502 });
  }

  /** Log Google's detail for us; give customers a plain message that never carries vendor text or keys. */
  private async toException(response: Response): Promise<ServiceUnavailableException> {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    this.logger.error(`Google video request failed (${response.status}): ${detail}`);
    if (response.status === 404) {
      this.logger.error(
        `Google does not know the video model "${this.model}" - it may have been retired. Set GOOGLE_VIDEO_MODEL.`,
      );
    }
    if (response.status === 429) {
      return new ServiceUnavailableException(
        'Video generation is busy or temporarily out of quota. Please try again in a few minutes - no credits were used.',
      );
    }
    if (response.status === 400 && /safety|policy|blocked|prohibited/i.test(detail)) {
      return new ServiceUnavailableException(
        'This prompt was declined by the video safety rules. Rephrase it and try again - no credits were used.',
      );
    }
    return new ServiceUnavailableException(
      'Video generation is temporarily unavailable on our side. Please try again later - no credits were used.',
    );
  }
}
