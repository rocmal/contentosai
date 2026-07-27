import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../domain/interfaces/ai-provider.interface';
import { BaseAIProvider } from './base-ai-provider';

interface OpenAIChatCompletionResponse {
  model: string;
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

@Injectable()
export class OpenAIProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'openai';
  private readonly defaultModel = 'gpt-4o-mini';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const apiKey = this.configService.get<string>('ai.openai.apiKey') ?? '';
    this.assertConfigured(apiKey, 'OpenAI');

    const model = request.model ?? this.defaultModel;
    const messages = [
      ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
      { role: 'user', content: request.prompt },
    ];

    const response = await this.postJson<OpenAIChatCompletionResponse>(
      'https://api.openai.com/v1/chat/completions',
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
}
