import { registerAs } from '@nestjs/config';

export default registerAs('meta', () => ({
  appId: process.env.META_APP_ID ?? '',
  appSecret: process.env.META_APP_SECRET ?? '',
  redirectUri: process.env.META_REDIRECT_URI ?? '',
  graphApiVersion: process.env.META_GRAPH_API_VERSION ?? 'v21.0',
  /** Ask for the Instagram permissions too. Off until the website can post to Instagram: Meta's App Review refuses
   * apps that request permissions nobody can see them use (META_INSTAGRAM_ENABLED=true turns it on). */
  instagramEnabled: process.env.META_INSTAGRAM_ENABLED === 'true',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
