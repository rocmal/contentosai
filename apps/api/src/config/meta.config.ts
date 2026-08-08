import { registerAs } from '@nestjs/config';

export default registerAs('meta', () => ({
  appId: process.env.META_APP_ID ?? '',
  appSecret: process.env.META_APP_SECRET ?? '',
  redirectUri: process.env.META_REDIRECT_URI ?? '',
  graphApiVersion: process.env.META_GRAPH_API_VERSION ?? 'v21.0',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
