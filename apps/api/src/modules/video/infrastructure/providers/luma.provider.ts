import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

interface LumaGenerationResponse {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  failure_reason?: string;
  assets?: { video?: string };
}

const LUMA_API_BASE = 'https://api.lumalabs.ai/dream-machine/v1';

/** Cinematic image/text-to-video via Luma's Dream Machine (Ray 2). Duration
 * is fixed to Luma's two supported lengths - the closer of "5s"/"9s" to
 * whatever the caller asked for, rather than an arbitrary value Luma would reject. */
@Injectable()
export class LumaProvider implements IVideoProvider {
  readonly name = 'luma';
  private readonly defaultModel = 'ray-2';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.video.luma.apiKey') ?? '';
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Luma Dream Machine video generation is not configured');
    }
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${LUMA_API_BASE}/generations/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        prompt: request.prompt,
        model,
        duration: (request.durationSeconds ?? 5) > 7 ? '9s' : '5s',
        ...(request.imageUrl ? { keyframes: { frame0: { type: 'image', url: request.imageUrl } } } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceUnavailableException(`Luma request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const body = (await response.json()) as LumaGenerationResponse;
    return { provider: this.name, model, jobId: body.id, status: this.mapStatus(body.state) };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Luma Dream Machine video generation is not configured');
    }

    const response = await fetch(`${LUMA_API_BASE}/generations/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Luma status check failed (${response.status})`);
    }

    const body = (await response.json()) as LumaGenerationResponse;
    return {
      provider: this.name,
      model: this.defaultModel,
      jobId,
      status: this.mapStatus(body.state),
      videoUrl: body.assets?.video,
    };
  }

  private mapStatus(state: LumaGenerationResponse['state']): VideoGenerationResult['status'] {
    switch (state) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'dreaming':
        return 'processing';
      default:
        return 'queued';
    }
  }
}
