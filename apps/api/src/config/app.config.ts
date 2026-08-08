import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Lumora',
  env: process.env.APP_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  host: process.env.APP_HOST ?? 'localhost',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  isProduction: process.env.APP_ENV === 'production',
  isDevelopment: process.env.APP_ENV === 'development',
  isTest: process.env.APP_ENV === 'test',
  isStaging: process.env.APP_ENV === 'staging',
}));
