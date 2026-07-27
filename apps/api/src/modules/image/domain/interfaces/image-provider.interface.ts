export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  count?: number;
  model?: string;
}

export interface ImageGenerationResult {
  provider: string;
  model: string;
  status: 'completed' | 'processing';
  images: string[];
  jobId?: string;
}

/** Port every image-generation provider adapter implements. */
export interface IImageProvider {
  readonly name: string;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
