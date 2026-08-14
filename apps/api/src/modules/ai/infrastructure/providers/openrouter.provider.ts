import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../domain/interfaces/ai-provider.interface';
import { BaseAIProvider } from './base-ai-provider';

interface OpenRouterChatCompletionResponse {
  model: string;
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

@Injectable()
export class OpenRouterProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'openrouter';
  private readonly defaultModel = 'openai/gpt-4o-mini';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const apiKey = this.configService.get<string>('ai.openrouter.apiKey') ?? '';
    this.assertConfigured(apiKey, 'OpenRouter');
    const model = request.model ?? this.defaultModel;

    const messages = [
      ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
      { role: 'user', content: request.prompt },
    ];

    const response = await this.postJson<OpenRouterChatCompletionResponse>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      },
      { Authorization: `Bearer ${apiKey}` },
    );

    return {
      text: response.choices[0]?.message?.content ?? '',
      provider: this.name,
      model: response.model ?? model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !!this.configService.get<string>('ai.openrouter.apiKey');
  }
}
