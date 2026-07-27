import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../../domain/interfaces/image-provider.interface';

interface StabilityImageResponse {
  image: string;
  finish_reason: string;
}

@Injectable()
export class StabilityProvider implements IImageProvider {
  readonly name = 'stability';
  private readonly defaultModel = 'core';

  constructor(private readonly configService: ConfigService) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.configService.get<string>('ai.image.stability.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('Stability AI image generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const form = new FormData();
    form.append('prompt', request.prompt);
    form.append('output_format', 'png');

    const response = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      body: form,
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Stability AI request failed (${response.status})`);
    }

    const body = (await response.json()) as StabilityImageResponse;

    return {
      provider: this.name,
      model,
      status: 'completed',
      images: [`data:image/png;base64,${body.image}`],
    };
  }
}
