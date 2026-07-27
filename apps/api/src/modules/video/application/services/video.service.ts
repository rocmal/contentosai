import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VideoProviderFactory } from '../../infrastructure/video-provider.factory';
import { VideoGenerationResult } from '../../domain/interfaces/video-provider.interface';
import { GenerateVideoDto } from '../dto/generate-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private readonly providerFactory: VideoProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submitJob(dto: GenerateVideoDto, userId?: string): Promise<VideoGenerationResult> {
    const provider = this.providerFactory.getProvider(dto.provider);
    const result = await provider.submitJob({
      prompt: dto.prompt,
      model: dto.model,
      imageUrl: dto.imageUrl,
      durationSeconds: dto.durationSeconds,
    });

    this.eventEmitter.emit('video.job-submitted', {
      provider: result.provider,
      jobId: result.jobId,
      userId,
    });

    return result;
  }

  async getJobStatus(providerName: string, jobId: string): Promise<VideoGenerationResult> {
    const provider = this.providerFactory.getProvider(providerName);
    return provider.getJobStatus(jobId);
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
