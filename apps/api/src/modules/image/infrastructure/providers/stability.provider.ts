import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../../domain/interfaces/image-provider.interface';
import { ImageAspectRatio } from '../../domain/image-formats';

interface StabilityImageResponse {
  image?: string;
  finish_reason?: string;
}

interface StabilityErrorBody {
  errors?: string[];
  name?: string;
}

/** Stable Image Core is the standard tier (a flat 3 credits, about $0.03 per
 * image); Stable Image Ultra is the high tier (8 credits). Both take the same
 * parameters, and every Image Studio aspect ratio is one Stability accepts. */
const MODEL_FOR_QUALITY = { draft: 'core', standard: 'core', high: 'ultra' } as const;

function nearestSupportedRatio(size: string | undefined): ImageAspectRatio {
  const match = /^(\d+)x(\d+)$/.exec(size ?? '');
  if (!match) return '1:1';
  const ratio = Number(match[1]) / Number(match[2]);
  if (ratio > 1.4) return '16:9';
  if (ratio < 0.6) return '9:16';
  if (ratio < 0.72) return '2:3';
  if (ratio < 0.9) return '4:5';
  return '1:1';
}

@Injectable()
export class StabilityProvider implements IImageProvider {
  readonly name = 'stability';

  constructor(private readonly configService: ConfigService) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.configService.get<string>('ai.image.stability.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('Stability AI image generation is not configured');
    }

    const model = request.model ?? MODEL_FOR_QUALITY[request.quality ?? 'standard'];
    const aspectRatio = request.aspectRatio ?? nearestSupportedRatio(request.size);
    const count = request.count ?? 1;

    // Stability returns one image per call, so a batch is several parallel calls.
    const images = await Promise.all(
      Array.from({ length: count }, () => this.generateOne(apiKey, model, request.prompt, aspectRatio)),
    );

    return { provider: this.name, model, status: 'completed', images };
  }

  private async generateOne(
    apiKey: string,
    model: string,
    prompt: string,
    aspectRatio: ImageAspectRatio,
  ): Promise<string> {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('aspect_ratio', aspectRatio);
    form.append('output_format', 'jpeg');

    const response = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      body: form,
      signal: AbortSignal.timeout(110_000),
    });

    if (!response.ok) {
      let detail = `status ${response.status}`;
      try {
        const body = (await response.json()) as StabilityErrorBody;
        detail = body.errors?.join('; ') ?? body.name ?? detail;
      } catch {
        // keep the status-only detail
      }
      if (response.status === 403 || /moderation|filter|policy/i.test(detail)) {
        throw new BadRequestException(
          'Stability AI declined this prompt under its content policy. Rephrase it and try again - no credits were used.',
        );
      }
      throw new ServiceUnavailableException(`Stability AI request failed (${response.status}): ${detail}`);
    }

    const body = (await response.json()) as StabilityImageResponse;
    if (!body.image || body.finish_reason === 'CONTENT_FILTERED') {
      throw new BadRequestException(
        'Stability AI filtered this image. Rephrase the prompt and try again - no credits were used.',
      );
    }
    return `data:image/jpeg;base64,${body.image}`;
  }
}
