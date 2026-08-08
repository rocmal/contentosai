import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../../domain/interfaces/image-provider.interface';

interface FluxSubmitResponse {
  id: string;
  polling_url: string;
}

interface FluxResultResponse {
  status: 'Ready' | 'Pending' | 'Error' | 'Failed';
  result?: { sample: string };
}

const FLUX_API_BASE = 'https://api.bfl.ai';

/**
 * Flux (Black Forest Labs) generates asynchronously: submit a job, then poll
 * for a result. Unlike most job/poll APIs, the poll URL isn't a fixed path
 * you can reconstruct from the id - BFL returns a one-time `polling_url` in
 * the submit response (api.bfl.ai load-balances across regions) and that
 * exact URL must be reused for every poll. A handful of short polls are
 * attempted inline so callers get a completed image for typical (sub-few-
 * second) generations; slower jobs are returned with status "processing"
 * and a jobId the caller can poll later - though without the original
 * polling_url a later poll would need to fall back to the (deprecated but
 * still documented) `/v1/get_result?id=` path.
 */
@Injectable()
export class FluxProvider implements IImageProvider {
  readonly name = 'flux';
  private readonly defaultModel = 'flux-pro-1.1';
  private readonly maxPolls = 8;
  private readonly pollIntervalMs = 1500;

  constructor(private readonly configService: ConfigService) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.configService.get<string>('ai.image.flux.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('Flux image generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const submitResponse = await fetch(`${FLUX_API_BASE}/v1/${model}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-key': apiKey },
      body: JSON.stringify({
        prompt: request.prompt,
        width: 1024,
        height: 1024,
      }),
    });

    if (!submitResponse.ok) {
      const body = await submitResponse.text().catch(() => '');
      throw new ServiceUnavailableException(`Flux request failed (${submitResponse.status}): ${body.slice(0, 300)}`);
    }

    const { id, polling_url: pollingUrl } = (await submitResponse.json()) as FluxSubmitResponse;

    for (let attempt = 0; attempt < this.maxPolls; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      const resultResponse = await fetch(pollingUrl, {
        headers: { Accept: 'application/json', 'x-key': apiKey },
      });
      if (!resultResponse.ok) {
        continue;
      }
      const result = (await resultResponse.json()) as FluxResultResponse;
      if (result.status === 'Ready' && result.result?.sample) {
        return { provider: this.name, model, status: 'completed', images: [result.result.sample] };
      }
      if (result.status === 'Error' || result.status === 'Failed') {
        throw new ServiceUnavailableException('Flux image generation failed');
      }
    }

    return { provider: this.name, model, status: 'processing', images: [], jobId: id };
  }
}
