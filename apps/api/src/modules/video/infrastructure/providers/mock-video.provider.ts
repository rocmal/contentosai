import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IVideoProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';

// MDN's own CC0-licensed sample clip, used live in their documentation - more
// durable than the various "BigBuckBunny.mp4" GCS mirrors that circulate in
// tutorials, several of which now 403.
const SAMPLE_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const SIMULATED_RENDER_MS = 6000;
const MODEL_NAME = 'mock-video-v1';

interface MockJob {
  readyAt: number;
}

/**
 * Local-development stand-in for a real video vendor - no API key, no
 * network call. Mirrors the real providers' submit-then-poll lifecycle (a
 * short "processing" window before the clip is ready) so the rest of the
 * pipeline - the BullMQ polling worker, the frontend's polling UI - can be
 * exercised end-to-end without paying for Veo/Runway/Kling/Pika.
 * VideoProviderFactory only registers this outside of production.
 */
@Injectable()
export class MockVideoProvider implements IVideoProvider {
  readonly name = 'mock';
  private readonly jobs = new Map<string, MockJob>();

  async submitJob(_request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const jobId = randomUUID();
    this.jobs.set(jobId, { readyAt: Date.now() + SIMULATED_RENDER_MS });
    return { provider: this.name, model: MODEL_NAME, jobId, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { provider: this.name, model: MODEL_NAME, jobId, status: 'failed' };
    }

    if (Date.now() < job.readyAt) {
      return { provider: this.name, model: MODEL_NAME, jobId, status: 'processing' };
    }

    return {
      provider: this.name,
      model: MODEL_NAME,
      jobId,
      status: 'completed',
      videoUrl: SAMPLE_VIDEO_URL,
    };
  }
}
