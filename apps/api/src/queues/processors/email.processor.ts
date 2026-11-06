import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { IMailer, MAILER } from '@shared/mail/mailer.interface';
import { EmailJobName, QueueName } from '../queue-names';

interface VerificationEmailJobData {
  to: string;
  token: string;
}

interface PasswordResetEmailJobData {
  to: string;
  token: string;
}

interface AccountCreatedEmailJobData {
  to: string;
  /** null when the admin set the password: the email then only says the account is ready. */
  token: string | null;
  firstName: string;
}

/** The name was typed by a platform admin: never let it add markup to the email. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

@Processor(QueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(MAILER) private readonly mailer: IMailer,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EmailJobName.VERIFICATION:
        return this.sendVerificationEmail(job.data as VerificationEmailJobData);
      case EmailJobName.PASSWORD_RESET:
        return this.sendPasswordResetEmail(job.data as PasswordResetEmailJobData);
      case EmailJobName.ACCOUNT_CREATED:
        return this.sendAccountCreatedEmail(job.data as AccountCreatedEmailJobData);
      default:
        throw new Error(`Unknown email job "${job.name}"`);
    }
  }

  private async sendVerificationEmail(data: VerificationEmailJobData): Promise<void> {
    const appUrl = this.configService.get<string>('app.url');
    const verifyLink = `${appUrl}/verify-email?token=${data.token}`;
    await this.mailer.send({
      to: data.to,
      subject: 'Verify your Lumora account',
      html: `<p>Welcome to Lumora. Please verify your email by visiting <a href="${verifyLink}">${verifyLink}</a>.</p>`,
    });
  }

  private async sendPasswordResetEmail(data: PasswordResetEmailJobData): Promise<void> {
    const appUrl = this.configService.get<string>('app.url');
    const resetLink = `${appUrl}/reset-password?token=${data.token}`;
    await this.mailer.send({
      to: data.to,
      subject: 'Reset your Lumora password',
      html: `<p>Reset your password by visiting <a href="${resetLink}">${resetLink}</a>. This link expires in 1 hour.</p>`,
    });
  }

  private async sendAccountCreatedEmail(data: AccountCreatedEmailJobData): Promise<void> {
    const appUrl = this.configService.get<string>('app.url');
    const greeting = data.firstName ? `Hi ${escapeHtml(data.firstName)},` : 'Hello,';
    if (!data.token) {
      const signIn = `${appUrl}/login`;
      await this.mailer.send({
        to: data.to,
        subject: 'Your Lumora account is ready',
        html: [
          `<p>${greeting}</p>`,
          `<p>The Lumora team has opened an account for you. Sign in at <a href="${signIn}">${signIn}</a> with this email address and the password they gave you.</p>`,
          `<p>You can change the password after signing in, under Profile.</p>`,
        ].join(''),
      });
      return;
    }
    const link = `${appUrl}/reset-password?token=${data.token}&welcome=1`;
    await this.mailer.send({
      to: data.to,
      subject: 'Your Lumora account is ready',
      html: [
        `<p>${greeting}</p>`,
        `<p>The Lumora team has opened an account for you. Choose your password here: <a href="${link}">${link}</a></p>`,
        `<p>The link works for 7 days. After that, use "Forgot password" on the sign-in page with this email address.</p>`,
      ].join(''),
    });
  }
}
