export interface VoiceGenerationRequest {
  text: string;
  voiceId?: string;
  model?: string;
}

export interface VoiceGenerationResult {
  provider: string;
  model: string;
  mimeType: string;
  audioBase64: string;
}

/** Port every text-to-speech provider adapter implements. */
export interface IVoiceProvider {
  readonly name: string;
  generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult>;
}
