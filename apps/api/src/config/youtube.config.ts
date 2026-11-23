import { registerAs } from '@nestjs/config';

/** Reuses the same Google Cloud OAuth client as login (GOOGLE_CLIENT_ID/
 * SECRET) with a separate redirect URI and a broader (upload) scope - Google
 * allows multiple authorized redirect URIs per OAuth client, so this avoids
 * provisioning a second Google Cloud project just for YouTube. */
export default registerAs('youtube', () => ({
  clientId: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
  clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? '').trim(),
  // Unset = this site's own address (like Sign in with Google's callback), so the variable is optional.
  redirectUri:
    process.env.YOUTUBE_REDIRECT_URI ||
    (process.env.APP_URL
      ? `${process.env.APP_URL.replace(/\/$/, '')}/api/v1/integrations/youtube/callback`
      : ''),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
