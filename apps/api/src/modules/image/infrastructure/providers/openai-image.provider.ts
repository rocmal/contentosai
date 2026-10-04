import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../../domain/interfaces/image-provider.interface';
import { nearestStandardOpenAiSize, OPENAI_QUALITY, openAiSizeFor } from '../../domain/image-formats';

interface OpenAIImagesResponse {
  data: { url?: string; b64_json?: string }[];
}

interface OpenAIErrorBody {
  error?: { message?: string; code?: string };
}

/** Image generation through OpenAI's gpt-image family. DALL-E 2 and 3 were shut
 * down on 2026-05-12, and gpt-image-1.5 / gpt-image-1-mini follow on
 * 2026-12-01, so the model is configurable (OPENAI_IMAGE_MODEL) and defaults to
 * gpt-image-2. gpt-image models always return base64 and reject DALL-E's
 * `response_format`, so it is never sent. */
@Injectable()
export class OpenAIImageProvider implements IImageProvider {
  readonly name = 'openai';
  private readonly fallbackModel = 'gpt-image-2';

  constructor(private readonly configService: ConfigService) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.configService.get<string>('ai.image.openai.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('OpenAI image generation is not configured');
    }

    const model =
      request.model ?? this.configService.get<string>('ai.image.openai.model') ?? this.fallbackModel;
    const size = request.aspectRatio ? openAiSizeFor(request.aspectRatio) : (request.size ?? '1024x1024');

    let response = await this.post(apiKey, model, request, size);

    // A custom size is documented as supported, but if the account's model
    // rejects it, retry once with the nearest of the three standard sizes - the
    // studio then trims the result to the platform's exact ratio.
    if (response.status === 400 && request.aspectRatio) {
      const detail = await this.errorMessage(response);
      if (/size/i.test(detail)) {
        response = await this.post(apiKey, model, request, nearestStandardOpenAiSize(request.aspectRatio));
      } else {
        throw this.toException(400, detail);
      }
    }

    if (!response.ok) {
      throw this.toException(response.status, await this.errorMessage(response));
    }

    const body = (await response.json()) as OpenAIImagesResponse;
    const images = body.data.map((item) =>
      item.b64_json ? `data:image/jpeg;base64,${item.b64_json}` : (item.url ?? ''),
    );
    if (images.length === 0 || images.some((image) => !image)) {
      throw new ServiceUnavailableException('OpenAI returned no image. Please try again.');
    }

    return { provider: this.name, model, status: 'completed', images };
  }

  private post(apiKey: string, model: string, request: ImageGenerationRequest, size: string): Promise<Response> {
    return fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        n: request.count ?? 1,
        size,
        quality: OPENAI_QUALITY[request.quality ?? 'standard'],
        // JPEG keeps each response to a few hundred KB instead of several MB of PNG.
        output_format: 'jpeg',
        output_compression: 92,
      }),
      signal: AbortSignal.timeout(110_000),
    });
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const body = (await response.clone().json()) as OpenAIErrorBody;
      return body.error?.message ?? `status ${response.status}`;
    } catch {
      return `status ${response.status}`;
    }
  }

  private toException(status: number, detail: string): Error {
    if (status === 400 && /safety|policy|moderation|blocked/i.test(detail)) {
      return new BadRequestException(
        'OpenAI declined this prompt under its content policy. Rephrase it and try again - no credits were used.',
      );
    }
    return new ServiceUnavailableException(`OpenAI image request failed (${status}): ${detail}`);
  }
}
