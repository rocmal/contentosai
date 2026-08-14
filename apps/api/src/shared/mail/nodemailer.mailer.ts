import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { IMailer, SendMailInput } from './mailer.interface';

@Injectable()
export class NodemailerMailer implements IMailer {
  private readonly logger = new Logger(NodemailerMailer.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const username = this.configService.get<string>('mail.username');
      const host = this.configService.get<string>('mail.host') ?? '';
      // A loopback host means we're relaying through the box's own local MTA
      // (e.g. cPanel/Exim, the Node equivalent of PHP's mail()) rather than a
      // real external provider. That MTA's TLS cert is issued for the
      // server's real hostname, not "127.0.0.1"/"localhost", so strict
      // hostname verification always fails here - and since the connection
      // never leaves the machine, there's no network hop for cert pinning to
      // actually protect against. Only relaxed for loopback; a real external
      // SMTP provider still gets full certificate verification.
      const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
      this.transporter = createTransport({
        host,
        port: this.configService.get<number>('mail.port'),
        secure: this.configService.get<number>('mail.port') === 465,
        auth: username
          ? { user: username, pass: this.configService.get<string>('mail.password') }
          : undefined,
        tls: isLoopback ? { rejectUnauthorized: false } : undefined,
      });
    }
    return this.transporter;
  }

  async send(input: SendMailInput): Promise<void> {
    const host = this.configService.get<string>('mail.host');
    if (!host) {
      this.logger.warn(
        `SMTP is not configured - skipping email to ${input.to}: "${input.subject}"`,
      );
      return;
    }

    await this.getTransporter().sendMail({
      from: this.configService.get<string>('mail.from'),
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
