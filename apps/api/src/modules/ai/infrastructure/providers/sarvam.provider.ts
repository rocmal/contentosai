import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../domain/interfaces/ai-provider.interface';
import { BaseAIProvider } from './base-ai-provider';

/** Floor for max_tokens: reasoning tokens are spent from the same budget as the answer. */
const SARVAM_MIN_MAX_TOKENS = 8000;

/** Reasoning makes long answers slow (a Hindi reel script took about 48 s in testing). Stop just
 * under the 60 s the production Apache proxy allows an API request, so a slow run fails with a
 * clear message and a refund instead of a bare gateway error after the credit was taken. */
const SARVAM_TIMEOUT_MS = 55_000;

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
        // sarvam-105b reasons before it answers, and that reasoning counts
        // against max_tokens (about 1,000 to 2,000+ tokens even for a trivial
        // prompt, more for a long brand prompt). With the caller's usual cap
        // the whole budget goes on thinking and the visible answer comes back
        // empty, so never go below a floor that leaves room for the answer.
        max_tokens: Math.max(request.maxTokens ?? 2048, SARVAM_MIN_MAX_TOKENS),
        temperature: request.temperature ?? 0.2,
      },
      { 'api-subscription-key': apiKey, Authorization: `Bearer ${apiKey}` },
      SARVAM_TIMEOUT_MS,
    );

    const choice = response.choices[0];
    const text = choice?.message?.content ?? '';
    if (!text.trim() && choice?.finish_reason === 'length') {
      throw new ServiceUnavailableException(
        'Sarvam AI ran out of tokens while reasoning and returned no answer. Please try again or shorten the request.',
      );
    }

    return {
      text,
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
