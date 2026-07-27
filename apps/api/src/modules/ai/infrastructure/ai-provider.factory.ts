import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIProvider } from '../domain/interfaces/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

/**
 * Single point of provider selection. Application services ask the factory
 * for "the AI provider" and never instantiate or import a concrete provider
 * class themselves - swapping/adding providers never touches business logic.
 */
@Injectable()
export class AIProviderFactory {
  private readonly providers: Map<string, IAIProvider>;

  constructor(
    private readonly configService: ConfigService,
    openAIProvider: OpenAIProvider,
    geminiProvider: GeminiProvider,
    claudeProvider: ClaudeProvider,
    openRouterProvider: OpenRouterProvider,
  ) {
    this.providers = new Map<string, IAIProvider>([
      [openAIProvider.name, openAIProvider],
      [geminiProvider.name, geminiProvider],
      [claudeProvider.name, claudeProvider],
      [openRouterProvider.name, openRouterProvider],
    ]);
  }

  getProvider(name?: string): IAIProvider {
    const providerName = name ?? this.configService.get<string>('ai.defaultProvider') ?? 'openai';
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(
        `Unknown AI provider "${providerName}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
