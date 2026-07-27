import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'openai',
  openai: { apiKey: process.env.OPENAI_API_KEY ?? '' },
  gemini: { apiKey: process.env.GEMINI_API_KEY ?? '' },
  claude: { apiKey: process.env.CLAUDE_API_KEY ?? '' },
  openrouter: { apiKey: process.env.OPENROUTER_API_KEY ?? '' },
  video: {
    veo: { apiKey: process.env.VEO_API_KEY ?? '' },
    runway: { apiKey: process.env.RUNWAY_API_KEY ?? '' },
    kling: { apiKey: process.env.KLING_API_KEY ?? '' },
    pika: { apiKey: process.env.PIKA_API_KEY ?? '' },
  },
  image: {
    openai: { apiKey: process.env.OPENAI_API_KEY ?? '' },
    flux: { apiKey: process.env.FLUX_API_KEY ?? '' },
    stability: { apiKey: process.env.STABILITY_API_KEY ?? '' },
  },
  voice: {
    elevenlabs: { apiKey: process.env.ELEVENLABS_API_KEY ?? '' },
    cartesia: { apiKey: process.env.CARTESIA_API_KEY ?? '' },
    azure: {
      apiKey: process.env.AZURE_SPEECH_KEY ?? '',
      region: process.env.AZURE_SPEECH_REGION ?? 'eastus',
    },
  },
}));
