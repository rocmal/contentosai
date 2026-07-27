export interface VideoGenerationRequest {
  prompt: string;
  durationSeconds?: number;
  model?: string;
  imageUrl?: string;
}

export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoGenerationResult {
  provider: string;
  model: string;
  jobId: string;
  status: VideoJobStatus;
  videoUrl?: string;
}

/**
 * Every video provider is inherently asynchronous (generation takes seconds
 * to minutes), so the port is job-oriented: submit a job, then poll it.
 */
export interface IVideoProvider {
  readonly name: string;
  submitJob(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  getJobStatus(jobId: string): Promise<VideoGenerationResult>;
}
