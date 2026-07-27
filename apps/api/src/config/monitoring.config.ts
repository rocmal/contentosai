import { registerAs } from '@nestjs/config';

export default registerAs('monitoring', () => ({
  sentryDsn: process.env.SENTRY_DSN ?? '',
  posthogKey: process.env.POSTHOG_KEY ?? '',
}));
