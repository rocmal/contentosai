import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../../../domain/interfaces/ai-provider.interface';

/**
 * Test double for IAIProvider - lets unit tests exercise AiService/
 * AIProviderFactory without making a real network call to any vendor.
 */
export class MockAIProvider implements IAIProvider {
  readonly generateText = jest.fn(
    async (request: AIGenerationRequest): Promise<AIGenerationResult> => ({
      text: `mock response for: ${request.prompt}`,
      provider: this.name,
      model: request.model ?? 'mock-model',
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    }),
  );

  constructor(readonly name: string = 'mock') {}
}
