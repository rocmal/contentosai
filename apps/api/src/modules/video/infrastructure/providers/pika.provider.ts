import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

interface PikaSubmitResponse {
  id: string;
}

interface PikaStatusResponse {
  status: 'queued' | 'processing' | 'finished' | 'failed';
  video_url?: string;
}

@Injectable()
export class PikaProvider implements IVideoProvider {
  readonly name = 'pika';
  private readonly defaultModel = 'pika-2.0';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.video.pika.apiKey') ?? '';
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Pika video generation is not configured');
    }
    const model = request.model ?? this.defaultModel;

    const response = await fetch('https://api.pika.art/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        promptText: request.prompt,
        options: { duration: request.durationSeconds ?? 4 },
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Pika request failed (${response.status})`);
    }

    const body = (await response.json()) as PikaSubmitResponse;
    return { provider: this.name, model, jobId: body.id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await fetch(`https://api.pika.art/v1/generate/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Pika status check failed (${response.status})`);
    }

    const body = (await response.json()) as PikaStatusResponse;
    return {
      provider: this.name,
      model: this.defaultModel,
      jobId,
      status: this.mapStatus(body.status),
      videoUrl: body.video_url,
    };
  }

  private mapStatus(status: PikaStatusResponse['status']): VideoGenerationResult['status'] {
    switch (status) {
      case 'finished':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'processing':
        return 'processing';
      default:
        return 'queued';
    }
  }
}
