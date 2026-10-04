import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'openai',
  openai: { apiKey: process.env.OPENAI_API_KEY ?? '' },
  gemini: { apiKey: process.env.GEMINI_API_KEY ?? '' },
  claude: { apiKey: process.env.CLAUDE_API_KEY ?? '' },
  openrouter: { apiKey: process.env.OPENROUTER_API_KEY ?? '' },
  sarvam: { apiKey: process.env.SARVAM_API_KEY ?? '' },
  video: {
    veo: { apiKey: process.env.VEO_API_KEY ?? '' },
    runway: { apiKey: process.env.RUNWAY_API_KEY ?? '' },
    kling: { apiKey: process.env.KLING_API_KEY ?? '' },
    pika: { apiKey: process.env.PIKA_API_KEY ?? '' },
    luma: { apiKey: process.env.LUMA_API_KEY ?? '' },
    omni: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      baseUrl: process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
    },
  },
  image: {
    // OPENAI_IMAGE_MODEL: DALL-E 3 is shut down; gpt-image-1.5 and -1-mini retire on
    // 2026-12-01. Change this (not code) when OpenAI renames or replaces the model.
    openai: { apiKey: process.env.OPENAI_API_KEY ?? '', model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2' },
    flux: { apiKey: process.env.FLUX_API_KEY ?? '' },
    stability: { apiKey: process.env.STABILITY_API_KEY ?? '' },
  },
  character: {
    did: { apiKey: process.env.DID_API_KEY ?? '' },
    heygen: { apiKey: process.env.HEYGEN_API_KEY ?? '' },
    synthesia: {
      apiKey: process.env.SYNTHESIA_API_KEY ?? '',
      // Synthesia animates one of YOUR pre-built avatars, not an arbitrary
      // uploaded photo - see synthesia.provider.ts.
      avatarId: process.env.SYNTHESIA_AVATAR_ID ?? '',
      testMode: process.env.SYNTHESIA_TEST_MODE ?? 'true',
    },
    sadtalker: {
      // Local, free, self-hosted alternative to D-ID - lives outside apps/
      // (a standalone Python venv + checkpoints, not part of the Node app),
      // so these are filesystem paths rather than an API key.
      pythonPath: process.env.SADTALKER_PYTHON_PATH ?? '',
      dir: process.env.SADTALKER_DIR ?? '',
    },
    wav2lip: {
      pythonPath: process.env.WAV2LIP_PYTHON_PATH ?? '',
      dir: process.env.WAV2LIP_DIR ?? '',
      checkpointPath: process.env.WAV2LIP_CHECKPOINT_PATH ?? '',
    },
  },
  voice: {
    // Default provider for requests that omit `provider` - "edge" needs no
    // account/API key/billing, so local development works out of the box.
    // Switch to azure/elevenlabs/cartesia later by changing this one var.
    defaultProvider: process.env.VOICE_PROVIDER ?? 'edge',
    edge: {},
    elevenlabs: { apiKey: process.env.ELEVENLABS_API_KEY ?? '' },
    cartesia: { apiKey: process.env.CARTESIA_API_KEY ?? '' },
    // Same key as ai.sarvam.apiKey above - one Sarvam account covers both
    // Chat Completions and Text-to-Speech.
    sarvam: { apiKey: process.env.SARVAM_API_KEY ?? '' },
    azure: {
      apiKey: process.env.AZURE_SPEECH_KEY ?? '',
      region: process.env.AZURE_SPEECH_REGION ?? 'eastus',
    },
    piper: {
      // Fully offline fallback - a standalone native binary + a directory of
      // local .onnx voice models (one per language/speaker), filesystem
      // paths rather than an API key (same shape as the SadTalker/Wav2Lip
      // local paths in `character` above).
      binaryPath: process.env.PIPER_BINARY_PATH ?? '',
      voicesDir: process.env.PIPER_VOICES_DIR ?? '',
      defaultVoiceId: process.env.PIPER_DEFAULT_VOICE ?? 'en_US-lessac-medium',
    },
  },
}));
