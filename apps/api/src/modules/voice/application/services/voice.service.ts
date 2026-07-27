import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoiceProviderFactory } from '../../infrastructure/voice-provider.factory';
import { VoiceGenerationResult } from '../../domain/interfaces/voice-provider.interface';
import { GenerateSpeechDto } from '../dto/generate-speech.dto';

@Injectable()
export class VoiceService {
  constructor(
    private readonly providerFactory: VoiceProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateSpeech(dto: GenerateSpeechDto, userId?: string): Promise<VoiceGenerationResult> {
    const provider = this.providerFactory.getProvider(dto.provider);
    const result = await provider.generateSpeech({
      text: dto.text,
      voiceId: dto.voiceId,
      model: dto.model,
    });

    this.eventEmitter.emit('voice.generated', { provider: result.provider, userId });

    return result;
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
