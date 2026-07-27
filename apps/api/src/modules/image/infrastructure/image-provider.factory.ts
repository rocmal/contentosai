import { BadRequestException, Injectable } from '@nestjs/common';
import { IImageProvider } from '../domain/interfaces/image-provider.interface';
import { OpenAIImageProvider } from './providers/openai-image.provider';
import { StabilityProvider } from './providers/stability.provider';
import { FluxProvider } from './providers/flux.provider';

@Injectable()
export class ImageProviderFactory {
  private readonly providers: Map<string, IImageProvider>;

  constructor(
    openAIImageProvider: OpenAIImageProvider,
    stabilityProvider: StabilityProvider,
    fluxProvider: FluxProvider,
  ) {
    this.providers = new Map<string, IImageProvider>([
      [openAIImageProvider.name, openAIImageProvider],
      [stabilityProvider.name, stabilityProvider],
      [fluxProvider.name, fluxProvider],
    ]);
  }

  getProvider(name: string): IImageProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown image provider "${name}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
