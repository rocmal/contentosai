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
}
