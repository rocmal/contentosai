export interface VoiceGenerationRequest {
  text: string;
  voiceId?: string;
  model?: string;
  /** BCP-47 language code (e.g. "hi-IN") - only meaningful for providers with
   * multi-language voices (currently Sarvam); ignored by the rest. */
  languageCode?: string;
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

/** A recording to turn into a reusable voice (instant voice cloning). */
export interface VoiceCloneRequest {
  name: string;
  audio: Buffer;
  mimeType: string;
}

/** Port every text-to-speech provider adapter implements. */
export interface IVoiceProvider {
  readonly name: string;
  generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult>;
  /** Only providers that can clone a voice from a sample implement these two. Returns the new voice id. */
  cloneVoice?(request: VoiceCloneRequest): Promise<string>;
  deleteVoice?(voiceId: string): Promise<void>;
  /** Voices this provider currently has available (empty array if not configured/reachable). */
  listVoices(): Promise<VoiceInfo[]>;
  /** Cheap readiness check - true if the provider is configured and reachable. */
  healthCheck(): Promise<boolean>;
}
