import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../domain/interfaces/ai-provider.interface';
import { BaseAIProvider } from './base-ai-provider';

interface GeminiGenerateContentResponse {
  candidates?: { content: { parts: { text: string }[] } }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable()
export class GeminiProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'gemini';
  private readonly defaultModel = 'gemini-1.5-flash';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const apiKey = this.configService.get<string>('ai.gemini.apiKey') ?? '';
    this.assertConfigured(apiKey, 'Gemini');
    const model = request.model ?? this.defaultModel;

    const response = await this.postJson<GeminiGenerateContentResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        ...(request.systemPrompt
          ? { systemInstruction: { parts: [{ text: request.systemPrompt }] } }
          : {}),
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 1024,
          temperature: request.temperature ?? 0.7,
        },
      },
      {},
    );

    const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') ?? '';

    return {
      text,
      provider: this.name,
      model,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }
}
