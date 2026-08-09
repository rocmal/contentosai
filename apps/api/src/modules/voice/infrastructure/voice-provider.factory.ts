import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IVoiceProvider } from '../domain/interfaces/voice-provider.interface';
import { EdgeTTSProvider } from './providers/edge-tts.provider';
import { ElevenLabsProvider } from './providers/elevenlabs.provider';
import { CartesiaProvider } from './providers/cartesia.provider';
import { AzureProvider } from './providers/azure.provider';
import { PiperProvider } from './providers/piper.provider';
import { SarvamVoiceProvider } from './providers/sarvam.provider';

@Injectable()
export class VoiceProviderFactory {
  private readonly providers: Map<string, IVoiceProvider>;

  constructor(
    private readonly configService: ConfigService,
    edgeTTSProvider: EdgeTTSProvider,
    elevenLabsProvider: ElevenLabsProvider,
    cartesiaProvider: CartesiaProvider,
    azureProvider: AzureProvider,
    piperProvider: PiperProvider,
    sarvamVoiceProvider: SarvamVoiceProvider,
  ) {
    this.providers = new Map<string, IVoiceProvider>([
      [edgeTTSProvider.name, edgeTTSProvider],
      [elevenLabsProvider.name, elevenLabsProvider],
      [cartesiaProvider.name, cartesiaProvider],
      [azureProvider.name, azureProvider],
      [piperProvider.name, piperProvider],
      [sarvamVoiceProvider.name, sarvamVoiceProvider],
    ]);
  }

  /** Falls back to VOICE_PROVIDER (default "edge") when no provider is requested. */
  getProvider(name?: string): IVoiceProvider {
    const providerName =
      name ?? this.configService.get<string>('ai.voice.defaultProvider') ?? 'edge';
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(
        `Unknown voice provider "${providerName}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
