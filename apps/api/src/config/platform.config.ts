import { registerAs } from '@nestjs/config';

/** Lumora's own staff. PLATFORM_ADMIN_EMAILS (a GitHub secret, comma-separated) names the accounts that may manage
 * every customer - credits, plans, users. It is not in the code because the repository is public: nobody should
 * know which account to go after. Everyone else, including each workspace's "super-admin" (its owner), only ever
 * reaches their own organization. */
export default registerAs('platform', () => ({
  adminEmails: (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
}));
