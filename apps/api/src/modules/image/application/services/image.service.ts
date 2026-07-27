import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImageProviderFactory } from '../../infrastructure/image-provider.factory';
import { ImageGenerationResult } from '../../domain/interfaces/image-provider.interface';
import { GenerateImageDto } from '../dto/generate-image.dto';

@Injectable()
export class ImageService {
  constructor(
    private readonly providerFactory: ImageProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateImage(dto: GenerateImageDto, userId?: string): Promise<ImageGenerationResult> {
    const provider = this.providerFactory.getProvider(dto.provider);
    const result = await provider.generateImage({
      prompt: dto.prompt,
      model: dto.model,
      size: dto.size,
      count: dto.count,
    });

    this.eventEmitter.emit('image.generated', {
      provider: result.provider,
      model: result.model,
      userId,
    });

    return result;
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
