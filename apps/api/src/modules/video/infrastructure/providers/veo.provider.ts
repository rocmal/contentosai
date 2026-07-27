import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

interface VeoOperationResponse {
  name: string;
  done?: boolean;
  response?: { generatedVideos?: { video: { uri: string } }[] };
  error?: { message: string };
}

@Injectable()
export class VeoProvider implements IVideoProvider {
  readonly name = 'veo';
  private readonly defaultModel = 'veo-2.0-generate-001';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.video.veo.apiKey') ?? '';
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Google Veo video generation is not configured');
    }
    const model = request.model ?? this.defaultModel;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: request.prompt }] }),
      },
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(`Veo request failed (${response.status})`);
    }

    const body = (await response.json()) as VeoOperationResponse;
    return { provider: this.name, model, jobId: body.name, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${jobId}?key=${this.apiKey}`,
    );
    if (!response.ok) {
      throw new ServiceUnavailableException(`Veo status check failed (${response.status})`);
    }

    const body = (await response.json()) as VeoOperationResponse;
    if (body.error) {
      return { provider: this.name, model: this.defaultModel, jobId, status: 'failed' };
    }

    const videoUrl = body.response?.generatedVideos?.[0]?.video?.uri;
    return {
      provider: this.name,
      model: this.defaultModel,
      jobId,
      status: body.done ? 'completed' : 'processing',
      videoUrl,
    };
  }
}
