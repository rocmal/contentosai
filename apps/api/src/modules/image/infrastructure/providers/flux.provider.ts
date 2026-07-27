import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../../domain/interfaces/image-provider.interface';

interface FluxSubmitResponse {
  id: string;
}

interface FluxResultResponse {
  status: 'Ready' | 'Pending' | 'Error';
  result?: { sample: string };
}

/**
 * Flux (Black Forest Labs) generates asynchronously: submit a job, then poll
 * for a result. A handful of short polls are attempted inline so callers get
 * a completed image for typical (sub-few-second) generations; slower jobs are
 * returned with status "processing" and a jobId the caller can poll later.
 */
@Injectable()
export class FluxProvider implements IImageProvider {
  readonly name = 'flux';
  private readonly defaultModel = 'flux-pro-1.1';
  private readonly maxPolls = 5;
  private readonly pollIntervalMs = 1000;

  constructor(private readonly configService: ConfigService) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.configService.get<string>('ai.image.flux.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('Flux image generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const submitResponse = await fetch(`https://api.bfl.ml/v1/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-key': apiKey },
      body: JSON.stringify({
        prompt: request.prompt,
        width: 1024,
        height: 1024,
      }),
    });

    if (!submitResponse.ok) {
      throw new ServiceUnavailableException(`Flux request failed (${submitResponse.status})`);
    }

    const { id } = (await submitResponse.json()) as FluxSubmitResponse;

    for (let attempt = 0; attempt < this.maxPolls; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      const resultResponse = await fetch(`https://api.bfl.ml/v1/get_result?id=${id}`, {
        headers: { 'x-key': apiKey },
      });
      if (!resultResponse.ok) {
        continue;
      }
      const result = (await resultResponse.json()) as FluxResultResponse;
      if (result.status === 'Ready' && result.result?.sample) {
        return { provider: this.name, model, status: 'completed', images: [result.result.sample] };
      }
    }

    return { provider: this.name, model, status: 'processing', images: [], jobId: id };
  }
}
