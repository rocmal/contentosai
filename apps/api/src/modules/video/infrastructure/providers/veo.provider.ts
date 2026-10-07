import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface VeoVideoRef {
  video?: { uri?: string };
}

interface VeoOperationResponse {
  name: string;
  done?: boolean;
  response?: {
    generateVideoResponse?: {
      generatedSamples?: VeoVideoRef[];
      raiMediaFilteredReasons?: string[];
    };
    generatedVideos?: VeoVideoRef[];
  };
  error?: { message?: string };
}

/** Veo only renders 4, 6 or 8 second clips, so a requested length snaps to the nearest one up. */
export function veoDurationSeconds(requested?: number): number {
  if (!requested || requested <= 4) return 4;
  if (requested <= 6) return 6;
  return 8;
}

/** Google Veo through the Gemini API. It uses the same Google key as Gemini text
 * (VEO_API_KEY only overrides it) and needs billing on that Google project. */
@Injectable()
export class VeoProvider implements IVideoProvider {
  readonly name = 'veo';
  private readonly logger = new Logger(VeoProvider.name);
  // The "fast" variant is about a quarter of the standard model's price; the
  // credit table in credits.constants.ts is priced against it.
  private readonly defaultModel = 'veo-3.1-fast-generate-preview';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return (
      this.configService.get<string>('ai.video.veo.apiKey') ||
      this.configService.get<string>('ai.gemini.apiKey') ||
      ''
    );
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Video generation is not set up on this server yet.');
    }
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${VEO_API_BASE}/models/${model}:predictLongRunning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        instances: [{ prompt: request.prompt }],
        parameters: {
          durationSeconds: veoDurationSeconds(request.durationSeconds),
          aspectRatio: request.aspectRatio ?? '16:9',
        },
      }),
    });

    if (!response.ok) {
      throw await this.toException(response);
    }

    const body = (await response.json()) as VeoOperationResponse;
    return { provider: this.name, model, jobId: body.name, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await fetch(`${VEO_API_BASE}/${jobId}`, {
      headers: { 'x-goog-api-key': this.apiKey },
    });
    if (!response.ok) {
      this.logger.error(`Veo status check failed (${response.status})`);
      throw new ServiceUnavailableException('Could not check the video status. Please try again.');
    }

    const body = (await response.json()) as VeoOperationResponse;
    if (body.error) {
      this.logger.error(`Veo job failed: ${body.error.message ?? 'unknown'}`);
      return { provider: this.name, model: this.defaultModel, jobId, status: 'failed' };
    }
    if (!body.done) {
      return { provider: this.name, model: this.defaultModel, jobId, status: 'processing' };
    }

    const samples =
      body.response?.generateVideoResponse?.generatedSamples ??
      body.response?.generatedVideos ??
      [];
    const videoUrl = samples[0]?.video?.uri;
    if (!videoUrl) {
      // Finished but nothing came back - Google's safety filter blocked the prompt or output.
      const reasons = body.response?.generateVideoResponse?.raiMediaFilteredReasons ?? [];
      this.logger.warn(`Veo job ${jobId} finished without a video. ${reasons.join('; ')}`);
      return { provider: this.name, model: this.defaultModel, jobId, status: 'failed' };
    }
    return { provider: this.name, model: this.defaultModel, jobId, status: 'completed', videoUrl };
  }

  /** The video link Google returns only works with the API key, so we download it ourselves. */
  fetchVideo(url: string): Promise<Response> {
    return fetch(url, { headers: { 'x-goog-api-key': this.apiKey }, redirect: 'follow' });
  }

  /** Log Google's detail for us; give customers a plain message that never carries vendor text or keys. */
  private async toException(response: Response): Promise<ServiceUnavailableException> {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    this.logger.error(`Veo request failed (${response.status}): ${detail}`);
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
