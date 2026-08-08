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

/** A voice/speaker a provider can synthesize with, in a vendor-neutral shape. */
export interface VoiceInfo {
  id: string;
  name: string;
  locale?: string;
  gender?: string;
}

/** Port every text-to-speech provider adapter implements. */
export interface IVoiceProvider {
  readonly name: string;
  generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult>;
  /** Voices this provider currently has available (empty array if not configured/reachable). */
  listVoices(): Promise<VoiceInfo[]>;
  /** Cheap readiness check - true if the provider is configured and reachable. */
  healthCheck(): Promise<boolean>;
}
