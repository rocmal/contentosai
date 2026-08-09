import { Module } from '@nestjs/common';
import { StorageModule } from '@modules/storage/storage.module';
import { MediaModule } from '@modules/media/media.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { EdgeTTSProvider } from './infrastructure/providers/edge-tts.provider';
import { ElevenLabsProvider } from './infrastructure/providers/elevenlabs.provider';
import { CartesiaProvider } from './infrastructure/providers/cartesia.provider';
import { AzureProvider } from './infrastructure/providers/azure.provider';
import { PiperProvider } from './infrastructure/providers/piper.provider';
import { SarvamVoiceProvider } from './infrastructure/providers/sarvam.provider';
import { VoiceProviderFactory } from './infrastructure/voice-provider.factory';
import { VoiceService } from './application/services/voice.service';
import { VoiceController } from './presentation/voice.controller';

@Module({
  imports: [StorageModule, MediaModule, CreditsModule],
  controllers: [VoiceController],
  providers: [
    EdgeTTSProvider,
    ElevenLabsProvider,
    CartesiaProvider,
    AzureProvider,
    PiperProvider,
    SarvamVoiceProvider,
    VoiceProviderFactory,
    VoiceService,
  ],
  exports: [VoiceService, VoiceProviderFactory],
})
export class VoiceModule {}
