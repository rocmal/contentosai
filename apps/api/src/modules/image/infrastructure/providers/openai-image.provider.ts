import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../../domain/interfaces/image-provider.interface';

interface OpenAIImagesResponse {
  data: { url?: string; b64_json?: string }[];
}

@Injectable()
export class OpenAIImageProvider implements IImageProvider {
  readonly name = 'openai';
  private readonly defaultModel = 'dall-e-3';

  constructor(private readonly configService: ConfigService) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.configService.get<string>('ai.image.openai.apiKey') ?? '';
    if (!apiKey) {
      throw new ServiceUnavailableException('OpenAI image generation is not configured');
    }

    const model = request.model ?? this.defaultModel;
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        n: request.count ?? 1,
        size: request.size ?? '1024x1024',
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`OpenAI image request failed (${response.status})`);
    }

    const body = (await response.json()) as OpenAIImagesResponse;
    const images = body.data.map((item) =>
      item.url ? item.url : `data:image/png;base64,${item.b64_json}`,
    );

    return { provider: this.name, model, status: 'completed', images };
  }
}
