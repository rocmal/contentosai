import { BadRequestException, Injectable } from '@nestjs/common';
import { IVideoProvider } from '../domain/interfaces/video-provider.interface';
import { VeoProvider } from './providers/veo.provider';
import { RunwayProvider } from './providers/runway.provider';
import { KlingProvider } from './providers/kling.provider';
import { PikaProvider } from './providers/pika.provider';

@Injectable()
export class VideoProviderFactory {
  private readonly providers: Map<string, IVideoProvider>;

  constructor(
    veoProvider: VeoProvider,
    runwayProvider: RunwayProvider,
    klingProvider: KlingProvider,
    pikaProvider: PikaProvider,
  ) {
    this.providers = new Map<string, IVideoProvider>([
      [veoProvider.name, veoProvider],
      [runwayProvider.name, runwayProvider],
      [klingProvider.name, klingProvider],
      [pikaProvider.name, pikaProvider],
    ]);
  }

  getProvider(name: string): IVideoProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown video provider "${name}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
