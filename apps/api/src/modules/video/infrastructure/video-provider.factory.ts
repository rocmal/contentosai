import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IVideoProvider } from '../domain/interfaces/video-provider.interface';
import { VeoProvider } from './providers/veo.provider';
import { RunwayProvider } from './providers/runway.provider';
import { KlingProvider } from './providers/kling.provider';
import { PikaProvider } from './providers/pika.provider';
import { LumaProvider } from './providers/luma.provider';
import { MockVideoProvider } from './providers/mock-video.provider';

@Injectable()
export class VideoProviderFactory {
  private readonly providers: Map<string, IVideoProvider>;

  constructor(
    configService: ConfigService,
    veoProvider: VeoProvider,
    runwayProvider: RunwayProvider,
    klingProvider: KlingProvider,
    pikaProvider: PikaProvider,
    lumaProvider: LumaProvider,
    mockVideoProvider: MockVideoProvider,
  ) {
    this.providers = new Map<string, IVideoProvider>([
      [veoProvider.name, veoProvider],
      [runwayProvider.name, runwayProvider],
      [klingProvider.name, klingProvider],
      [pikaProvider.name, pikaProvider],
      [lumaProvider.name, lumaProvider],
    ]);

    // Only expose the no-cost mock provider outside production, so a
    // deployed environment can never silently serve a placeholder clip.
    if (!configService.get<boolean>('app.isProduction')) {
      this.providers.set(mockVideoProvider.name, mockVideoProvider);
    }
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
