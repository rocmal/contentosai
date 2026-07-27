import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

interface KlingSubmitResponse {
  data: { task_id: string };
}

interface KlingStatusResponse {
  data: {
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_result?: { videos?: { url: string }[] };
  };
}

@Injectable()
export class KlingProvider implements IVideoProvider {
  readonly name = 'kling';
  private readonly defaultModel = 'kling-v1';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.video.kling.apiKey') ?? '';
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Kling video generation is not configured');
    }
    const model = request.model ?? this.defaultModel;

    const response = await fetch('https://api.klingai.com/v1/videos/text2video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model_name: model,
        prompt: request.prompt,
        duration: String(request.durationSeconds ?? 5),
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Kling request failed (${response.status})`);
    }

    const body = (await response.json()) as KlingSubmitResponse;
    return { provider: this.name, model, jobId: body.data.task_id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await fetch(`https://api.klingai.com/v1/videos/text2video/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Kling status check failed (${response.status})`);
    }

    const body = (await response.json()) as KlingStatusResponse;
    return {
      provider: this.name,
      model: this.defaultModel,
      jobId,
      status: this.mapStatus(body.data.task_status),
      videoUrl: body.data.task_result?.videos?.[0]?.url,
    };
  }

  private mapStatus(
    status: KlingStatusResponse['data']['task_status'],
  ): VideoGenerationResult['status'] {
    switch (status) {
      case 'succeed':
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
