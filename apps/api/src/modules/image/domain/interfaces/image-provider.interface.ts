import { ImageAspectRatio, ImageQuality } from '../image-formats';

export interface ImageGenerationRequest {
  prompt: string;
  /** Explicit `WIDTHxHEIGHT`; ignored when `aspectRatio` is given. */
  size?: string;
  /** Preferred way to ask for a shape - each provider maps it to its own parameters. */
  aspectRatio?: ImageAspectRatio;
  quality?: ImageQuality;
  count?: number;
  model?: string;
}

export interface ImageGenerationResult {
  provider: string;
  model: string;
  status: 'completed' | 'processing';
  images: string[];
  jobId?: string;
  /** Credits taken for this request (0 when served from the cache). */
  creditsUsed?: number;
}

/** Port every image-generation provider adapter implements. */
export interface IImageProvider {
  readonly name: string;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
