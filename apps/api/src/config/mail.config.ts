import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  /** 'smtp' (default) or 'brevo-api' - HTTPS delivery for hosts that block SMTP. */
  transport: process.env.MAIL_TRANSPORT ?? 'smtp',
  brevoApiKey: process.env.BREVO_API_KEY ?? '',
  host: process.env.SMTP_HOST ?? '',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  username: process.env.SMTP_USERNAME ?? '',
  password: process.env.SMTP_PASSWORD ?? '',
  from: process.env.SMTP_FROM ?? 'no-reply@lumora.ai',
}));
