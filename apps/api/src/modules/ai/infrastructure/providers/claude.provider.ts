import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../domain/interfaces/ai-provider.interface';
import { BaseAIProvider } from './base-ai-provider';

interface ClaudeMessagesResponse {
  model: string;
  content: { type: string; text: string }[];
  usage?: { input_tokens: number; output_tokens: number };
}

@Injectable()
export class ClaudeProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'claude';
  private readonly defaultModel = 'claude-sonnet-5';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const apiKey = this.configService.get<string>('ai.claude.apiKey') ?? '';
    this.assertConfigured(apiKey, 'Claude');
    const model = request.model ?? this.defaultModel;

    const response = await this.postJson<ClaudeMessagesResponse>(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        messages: [{ role: 'user', content: request.prompt }],
      },
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    );

    const text = response.content?.map((block) => block.text).join('') ?? '';

    return {
      text,
      provider: this.name,
      model: response.model ?? model,
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
    };
  }
}
