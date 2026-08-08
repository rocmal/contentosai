import { Module } from '@nestjs/common';
import { StorageModule } from '@modules/storage/storage.module';
import { VoiceModule } from '@modules/voice/voice.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { DidProvider } from './infrastructure/providers/did.provider';
import { HeyGenProvider } from './infrastructure/providers/heygen.provider';
import { SynthesiaProvider } from './infrastructure/providers/synthesia.provider';
import { SadTalkerProvider } from './infrastructure/providers/sadtalker.provider';
import { Wav2LipProvider } from './infrastructure/providers/wav2lip.provider';
import { CharacterProviderFactory } from './infrastructure/character-provider.factory';
import { CharacterService } from './application/services/character.service';
import { CharacterController } from './presentation/character.controller';

@Module({
  imports: [StorageModule, VoiceModule, CreditsModule],
  controllers: [CharacterController],
  providers: [
    DidProvider,
    HeyGenProvider,
    SynthesiaProvider,
    SadTalkerProvider,
    Wav2LipProvider,
    CharacterProviderFactory,
    CharacterService,
  ],
  exports: [CharacterService, CharacterProviderFactory],
})
export class CharacterModule {}
