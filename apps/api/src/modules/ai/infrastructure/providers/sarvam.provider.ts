import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../domain/interfaces/ai-provider.interface';
import { BaseAIProvider } from './base-ai-provider';

interface SarvamChatCompletionResponse {
  model: string;
  choices: { message: { content: string }; finish_reason?: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Sarvam's Chat Completions API is OpenAI-compatible in shape. sarvam-105b
 * is tuned for Indic-language reasoning - a regional alternative alongside
 * openai/gemini/claude/openrouter, not a replacement for any of them.
 */
@Injectable()
export class SarvamProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'sarvam';
  private readonly defaultModel = 'sarvam-105b';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const apiKey = this.configService.get<string>('ai.sarvam.apiKey') ?? '';
    this.assertConfigured(apiKey, 'Sarvam AI');
    const model = request.model ?? this.defaultModel;

    const messages = [
      ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
      { role: 'user', content: request.prompt },
    ];

    // Sarvam's chat-completions docs list both headers as required (unlike
    // its other APIs, which accept api-subscription-key alone) - sending
    // both avoids relying on undocumented fallback behavior.
    const response = await this.postJson<SarvamChatCompletionResponse>(
      'https://api.sarvam.ai/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.2,
      },
      { 'api-subscription-key': apiKey, Authorization: `Bearer ${apiKey}` },
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
    return !!this.configService.get<string>('ai.sarvam.apiKey');
  }
}
