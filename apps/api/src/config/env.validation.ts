import * as Joi from 'joi';

export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export const envValidationSchema = Joi.object({
  // Application
  APP_NAME: Joi.string().default('Lumora'),
  APP_ENV: Joi.string()
    .valid(...Object.values(Environment))
    .default(Environment.Development),
  APP_PORT: Joi.number().port().default(3000),
  APP_HOST: Joi.string().default('localhost'),
  APP_URL: Joi.string().uri().required(),
  API_PREFIX: Joi.string().default('/api/v1'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Security
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  ENCRYPTION_KEY: Joi.string().min(16).required(),

  // Database
  DB_DIALECT: Joi.string().valid('mysql', 'postgres').default('mysql'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_LOGGING: Joi.boolean().default(false),
  DB_POOL_MAX: Joi.number().default(10),
  DB_POOL_MIN: Joi.number().default(0),
  DB_POOL_ACQUIRE: Joi.number().default(30000),
  DB_POOL_IDLE: Joi.number().default(10000),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // Storage
  STORAGE_PROVIDER: Joi.string().valid('local', 'minio', 's3').default('local'),
  LOCAL_STORAGE_PATH: Joi.string().default('storage'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_REGION: Joi.string().allow('').default(''),
  AWS_BUCKET: Joi.string().allow('').default(''),
  MINIO_ENDPOINT: Joi.string().allow('').default(''),
  MINIO_PORT: Joi.number().allow('').optional(),
  MINIO_ACCESS_KEY: Joi.string().allow('').default(''),
  MINIO_SECRET_KEY: Joi.string().allow('').default(''),
  MINIO_BUCKET: Joi.string().default('lumora'),

  // AI Providers
  AI_DEFAULT_PROVIDER: Joi.string()
    .valid('openai', 'gemini', 'claude', 'openrouter')
    .default('openai'),
  OPENAI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  CLAUDE_API_KEY: Joi.string().allow('').default(''),
  OPENROUTER_API_KEY: Joi.string().allow('').default(''),
  SARVAM_API_KEY: Joi.string().allow('').default(''),

  // Video providers
  VEO_API_KEY: Joi.string().allow('').default(''),
  RUNWAY_API_KEY: Joi.string().allow('').default(''),
  KLING_API_KEY: Joi.string().allow('').default(''),
  PIKA_API_KEY: Joi.string().allow('').default(''),
  LUMA_API_KEY: Joi.string().allow('').default(''),

  // Image providers
  FLUX_API_KEY: Joi.string().allow('').default(''),
  STABILITY_API_KEY: Joi.string().allow('').default(''),

  // Character (talking-avatar) providers
  DID_API_KEY: Joi.string().allow('').default(''),
  HEYGEN_API_KEY: Joi.string().allow('').default(''),
  SYNTHESIA_API_KEY: Joi.string().allow('').default(''),
  SYNTHESIA_AVATAR_ID: Joi.string().allow('').default(''),
  SYNTHESIA_TEST_MODE: Joi.string().allow('').default('true'),
  SADTALKER_PYTHON_PATH: Joi.string().allow('').default(''),
  SADTALKER_DIR: Joi.string().allow('').default(''),
  WAV2LIP_PYTHON_PATH: Joi.string().allow('').default(''),
  WAV2LIP_DIR: Joi.string().allow('').default(''),
  WAV2LIP_CHECKPOINT_PATH: Joi.string().allow('').default(''),

  // Voice providers
  VOICE_PROVIDER: Joi.string()
    .valid('edge', 'azure', 'elevenlabs', 'cartesia', 'piper')
    .default('edge'),
  ELEVENLABS_API_KEY: Joi.string().allow('').default(''),
  CARTESIA_API_KEY: Joi.string().allow('').default(''),
  AZURE_SPEECH_KEY: Joi.string().allow('').default(''),
  AZURE_SPEECH_REGION: Joi.string().default('eastus'),
  PIPER_BINARY_PATH: Joi.string().allow('').default(''),
  PIPER_VOICES_DIR: Joi.string().allow('').default(''),
  PIPER_DEFAULT_VOICE: Joi.string().allow('').default('en_US-lessac-medium'),

  // Email
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USERNAME: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().allow('').default('no-reply@lumora.ai'),

  // OAuth
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GITHUB_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').default(''),
  MICROSOFT_CLIENT_ID: Joi.string().allow('').default(''),
  MICROSOFT_CLIENT_SECRET: Joi.string().allow('').default(''),

  // Meta (Facebook / Instagram publishing)
  META_APP_ID: Joi.string().allow('').default(''),
  META_APP_SECRET: Joi.string().allow('').default(''),
  META_REDIRECT_URI: Joi.string().allow('').default(''),
  META_GRAPH_API_VERSION: Joi.string().default('v21.0'),

  // LinkedIn (member post publishing)
  LINKEDIN_CLIENT_ID: Joi.string().allow('').default(''),
  LINKEDIN_CLIENT_SECRET: Joi.string().allow('').default(''),
  LINKEDIN_REDIRECT_URI: Joi.string().allow('').default(''),
  LINKEDIN_API_VERSION: Joi.string().default('202401'),

  // YouTube (video upload publishing - reuses the Google OAuth client)
  YOUTUBE_REDIRECT_URI: Joi.string().allow('').default(''),

  // Razorpay (billing - primary payment gateway, India-first)
  RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  // Monitoring / Analytics
  SENTRY_DSN: Joi.string().allow('').default(''),
  POSTHOG_KEY: Joi.string().allow('').default(''),
});
