import { BadRequestException, Injectable } from '@nestjs/common';
import { IAvatarProvider } from '../domain/interfaces/avatar-provider.interface';
import {
  DidAvatarProvider,
  HeyGenAvatarProvider,
  LivePortraitAvatarProvider,
  SadTalkerAvatarProvider,
  SynthesiaAvatarProvider,
} from './providers/character-avatar.provider';
import { MockAvatarProvider } from './providers/mock-avatar.provider';

@Injectable()
export class AvatarProviderFactory {
  private readonly providers: Map<string, IAvatarProvider>;

  constructor(
    mockProvider: MockAvatarProvider,
    heyGenProvider: HeyGenAvatarProvider,
    didProvider: DidAvatarProvider,
    synthesiaProvider: SynthesiaAvatarProvider,
    livePortraitProvider: LivePortraitAvatarProvider,
    sadTalkerProvider: SadTalkerAvatarProvider,
  ) {
    this.providers = new Map<string, IAvatarProvider>([
      [mockProvider.name, mockProvider],
      [heyGenProvider.name, heyGenProvider],
      [didProvider.name, didProvider],
      [synthesiaProvider.name, synthesiaProvider],
      [livePortraitProvider.name, livePortraitProvider],
      [sadTalkerProvider.name, sadTalkerProvider],
    ]);
  }

  getProvider(name = 'mock'): IAvatarProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown avatar provider "${name}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
