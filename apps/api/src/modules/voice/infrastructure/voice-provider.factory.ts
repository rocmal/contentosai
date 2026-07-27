import { BadRequestException, Injectable } from '@nestjs/common';
import { IVoiceProvider } from '../domain/interfaces/voice-provider.interface';
import { ElevenLabsProvider } from './providers/elevenlabs.provider';
import { CartesiaProvider } from './providers/cartesia.provider';
import { AzureProvider } from './providers/azure.provider';

@Injectable()
export class VoiceProviderFactory {
  private readonly providers: Map<string, IVoiceProvider>;

  constructor(
    elevenLabsProvider: ElevenLabsProvider,
    cartesiaProvider: CartesiaProvider,
    azureProvider: AzureProvider,
  ) {
    this.providers = new Map<string, IVoiceProvider>([
      [elevenLabsProvider.name, elevenLabsProvider],
      [cartesiaProvider.name, cartesiaProvider],
      [azureProvider.name, azureProvider],
    ]);
  }

  getProvider(name: string): IVoiceProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown voice provider "${name}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
