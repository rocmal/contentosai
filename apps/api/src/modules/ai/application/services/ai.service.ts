import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { AIGenerationResult } from '../../domain/interfaces/ai-provider.interface';
import { GenerateContentDto } from '../dto/generate-content.dto';
import { AIContentGeneratedEvent } from '../events/ai-content-generated.event';

@Injectable()
export class AiService {
  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateText(dto: GenerateContentDto, userId?: string): Promise<AIGenerationResult> {
    const provider = this.providerFactory.getProvider(dto.provider);

    const result = await provider.generateText({
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      model: dto.model,
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
    });

    this.eventEmitter.emit(
      'ai.content-generated',
      new AIContentGeneratedEvent(result.provider, result.model, userId),
    );

    return result;
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }

  async getProviderStatuses(): Promise<{ name: string; available: boolean }[]> {
    const names = this.providerFactory.listProviders();
    return Promise.all(
      names.map(async (name) => ({
        name,
        available: await this.providerFactory.getProvider(name).healthCheck(),
      })),
    );
  }
}
