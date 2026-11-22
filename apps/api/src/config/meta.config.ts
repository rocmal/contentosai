import { registerAs } from '@nestjs/config';

export default registerAs('meta', () => ({
  appId: process.env.META_APP_ID ?? '',
  appSecret: process.env.META_APP_SECRET ?? '',
  redirectUri: process.env.META_REDIRECT_URI ?? '',
  graphApiVersion: process.env.META_GRAPH_API_VERSION ?? 'v21.0',
  /** Ask for the Instagram permissions too (on since 2026-11-22, when the website could post Reels; Meta's App Review
   * refuses permissions a reviewer cannot see used). META_INSTAGRAM_ENABLED=false turns it off. */
  instagramEnabled: process.env.META_INSTAGRAM_ENABLED !== 'false',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
