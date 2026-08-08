import { BadRequestException, Injectable } from '@nestjs/common';
import { ICharacterProvider } from '../domain/interfaces/character-provider.interface';
import { DidProvider } from './providers/did.provider';
import { HeyGenProvider } from './providers/heygen.provider';
import { SynthesiaProvider } from './providers/synthesia.provider';
import { SadTalkerProvider } from './providers/sadtalker.provider';
import { Wav2LipProvider } from './providers/wav2lip.provider';

@Injectable()
export class CharacterProviderFactory {
  private readonly providers: Map<string, ICharacterProvider>;

  constructor(
    didProvider: DidProvider,
    heyGenProvider: HeyGenProvider,
    synthesiaProvider: SynthesiaProvider,
    sadTalkerProvider: SadTalkerProvider,
    wav2LipProvider: Wav2LipProvider,
  ) {
    this.providers = new Map<string, ICharacterProvider>([
      [didProvider.name, didProvider],
      [heyGenProvider.name, heyGenProvider],
      [synthesiaProvider.name, synthesiaProvider],
      [sadTalkerProvider.name, sadTalkerProvider],
      [wav2LipProvider.name, wav2LipProvider],
    ]);
  }

  getProvider(name: string): ICharacterProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown character provider "${name}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
