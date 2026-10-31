/** A picture the model should look at alongside the prompt. Only formats every vision provider accepts. */
export interface AIImageInput {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  base64: string;
}

export interface AIGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Pictures sent with the prompt. Providers that cannot see pictures refuse the request rather than answer blind. */
  images?: AIImageInput[];
}

export interface AIGenerationUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIGenerationResult {
  text: string;
  provider: string;
  model: string;
  usage?: AIGenerationUsage;
}

/**
 * Port every text-generation provider adapter implements. Application
 * services depend only on this interface (obtained through AIProviderFactory)
 * and never import a vendor SDK/HTTP client directly.
 */
export interface IAIProvider {
  readonly name: string;
  generateText(request: AIGenerationRequest): Promise<AIGenerationResult>;
  /** Cheap readiness check - true if the provider is configured (mirrors
   * IVoiceProvider.healthCheck in the voice module). */
  healthCheck(): Promise<boolean>;
}
