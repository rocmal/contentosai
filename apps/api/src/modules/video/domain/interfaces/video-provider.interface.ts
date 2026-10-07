export interface VideoGenerationRequest {
  prompt: string;
  durationSeconds?: number;
  model?: string;
  imageUrl?: string;
  /** Veo renders 16:9 or 9:16; other shapes are cropped on screen. */
  aspectRatio?: '16:9' | '9:16';
}

export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoGenerationResult {
  provider: string;
  model: string;
  jobId: string;
  status: VideoJobStatus;
  videoUrl?: string;
  /** Signature of the request, so the same prompt by the same user can reuse this clip. */
  cacheKey?: string;
  /** True when an earlier clip was reused - nothing was charged. */
  cached?: boolean;
}

/**
 * Every video provider is inherently asynchronous (generation takes seconds
 * to minutes), so the port is job-oriented: submit a job, then poll it.
 */
export interface IVideoProvider {
  readonly name: string;
  submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  getJobStatus(jobId: string): Promise<VideoGenerationResult>;
  /** Providers whose finished-video link needs credentials download it themselves. */
  fetchVideo?(url: string): Promise<Response>;
}
