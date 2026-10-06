import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailer, SendMailInput } from './mailer.interface';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT_MS = 15_000;

/** Splits "Lumora <no-reply@lumoraos.in>" or a bare address into Brevo's sender object. */
export function parseSender(from: string): { email: string; name?: string } {
  const match = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(from);
  if (match) {
    const name = match[1]?.trim();
    return name ? { email: match[2].trim(), name } : { email: match[2].trim() };
  }
  return { email: from.trim() };
}

/**
 * Sends mail through Brevo's HTTPS API (port 443) instead of SMTP. Many hosts,
 * including GoDaddy VPS plans, intercept outbound SMTP ports, which makes SMTP to
 * an outside relay fail with a certificate error; HTTPS is never blocked.
 * Selected with MAIL_TRANSPORT=brevo-api and BREVO_API_KEY (an API key, not
 * the SMTP key).
 */
@Injectable()
export class BrevoApiMailer implements IMailer {
  constructor(private readonly configService: ConfigService) {}

  async send(input: SendMailInput): Promise<void> {
    const apiKey = this.configService.get<string>('mail.brevoApiKey');
    if (!apiKey) {
      // Choosing this transport on purpose and forgetting the key must be loud,
      // not a silently dropped password-reset email.
      throw new Error('MAIL_TRANSPORT is brevo-api but BREVO_API_KEY is not set');
    }
    const from = this.configService.get<string>('mail.from') ?? '';

    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseSender(from),
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      let reason = `status ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string; code?: string };
        reason = `${response.status} ${body.code ?? ''} ${body.message ?? ''}`.trim();
      } catch {
        // keep the status-only reason
      }
      // Thrown so the queue marks the job failed (and retries it).
      throw new Error(`Brevo API rejected the email: ${reason}`);
    }
  }
}
