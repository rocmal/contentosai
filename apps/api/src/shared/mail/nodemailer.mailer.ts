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
      this.transporter = createTransport({
        host: this.configService.get<string>('mail.host'),
        port: this.configService.get<number>('mail.port'),
        secure: this.configService.get<number>('mail.port') === 465,
        auth: username
          ? { user: username, pass: this.configService.get<string>('mail.password') }
          : undefined,
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
