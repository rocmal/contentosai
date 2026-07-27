import { Module } from '@nestjs/common';
import { ElevenLabsProvider } from './infrastructure/providers/elevenlabs.provider';
import { CartesiaProvider } from './infrastructure/providers/cartesia.provider';
import { AzureProvider } from './infrastructure/providers/azure.provider';
import { VoiceProviderFactory } from './infrastructure/voice-provider.factory';
import { VoiceService } from './application/services/voice.service';
import { VoiceController } from './presentation/voice.controller';

@Module({
  controllers: [VoiceController],
  providers: [
    ElevenLabsProvider,
    CartesiaProvider,
    AzureProvider,
    VoiceProviderFactory,
    VoiceService,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
