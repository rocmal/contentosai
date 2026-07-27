import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  output?: string[];
}

@Injectable()
export class RunwayProvider implements IVideoProvider {
  readonly name = 'runway';
  private readonly defaultModel = 'gen3a_turbo';
  private readonly apiVersion = '2024-11-06';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.video.runway.apiKey') ?? '';
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Runway video generation is not configured');
    }
    const model = request.model ?? this.defaultModel;

    const response = await fetch('https://api.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': this.apiVersion,
      },
      body: JSON.stringify({
        model,
        promptText: request.prompt,
        promptImage: request.imageUrl,
        duration: request.durationSeconds ?? 5,
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Runway request failed (${response.status})`);
    }

    const body = (await response.json()) as RunwayTaskResponse;
    return { provider: this.name, model, jobId: body.id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await fetch(`https://api.runwayml.com/v1/tasks/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, 'X-Runway-Version': this.apiVersion },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Runway status check failed (${response.status})`);
    }

    const body = (await response.json()) as RunwayTaskResponse;
    return {
      provider: this.name,
      model: this.defaultModel,
      jobId,
      status: this.mapStatus(body.status),
      videoUrl: body.output?.[0],
    };
  }

  private mapStatus(status: RunwayTaskResponse['status']): VideoGenerationResult['status'] {
    switch (status) {
      case 'SUCCEEDED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      case 'RUNNING':
        return 'processing';
      default:
        return 'queued';
    }
  }
}
