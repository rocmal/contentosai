import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailVerificationRequestedEvent } from '@modules/auth/application/events/email-verification-requested.event';
import { PasswordResetRequestedEvent } from '@modules/auth/application/events/password-reset-requested.event';
import { EmailJobName, QueueName } from '../queue-names';

/**
 * Bridges in-process domain events to the durable email queue. AuthService
 * only knows it emitted "a verification email was requested" - it has no
 * dependency on BullMQ, Nodemailer, or this listener.
 */
@Injectable()
export class EmailEventsListener {
  constructor(@InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue) {}

  @OnEvent('auth.email-verification-requested')
  async onEmailVerificationRequested(event: EmailVerificationRequestedEvent): Promise<void> {
    await this.emailQueue.add(EmailJobName.VERIFICATION, { to: event.email, token: event.token });
  }

  @OnEvent('auth.password-reset-requested')
  async onPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    await this.emailQueue.add(EmailJobName.PASSWORD_RESET, { to: event.email, token: event.token });
  }
}
