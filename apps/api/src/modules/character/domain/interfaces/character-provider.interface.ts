export interface CharacterGenerationRequest {
  /** Publicly-fetchable URL of the uploaded portrait photo. */
  sourceImageUrl: string;
  /** What the character should say - read aloud via the provider's own TTS. */
  script: string;
  /** Provider-specific TTS voice id (e.g. an Azure/Microsoft neural voice). */
  voiceId?: string;
}

export type CharacterJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface CharacterGenerationResult {
  provider: string;
  jobId: string;
  status: CharacterJobStatus;
  videoUrl?: string;
  /** Populated on status 'failed' so the UI can show why, instead of a generic message. */
  errorMessage?: string;
}

/**
 * Every talking-avatar provider is inherently asynchronous (rendering takes
 * seconds to minutes), so - same as the video module - the port is
 * job-oriented: submit a job, then poll it.
 */
export interface ICharacterProvider {
  readonly name: string;
  submitJob(request: CharacterGenerationRequest): Promise<CharacterGenerationResult>;
  getJobStatus(jobId: string): Promise<CharacterGenerationResult>;
}
