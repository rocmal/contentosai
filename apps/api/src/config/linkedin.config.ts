import { registerAs } from '@nestjs/config';

export default registerAs('linkedin', () => ({
  clientId: process.env.LINKEDIN_CLIENT_ID ?? '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
  redirectUri: process.env.LINKEDIN_REDIRECT_URI ?? '',
  apiVersion: process.env.LINKEDIN_API_VERSION ?? '202401',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
