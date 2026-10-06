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
// A transient mail failure (provider hiccup, network blip) should not lose the
// email: retry a few times with growing pauses, and keep a few failures to inspect.
const EMAIL_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 10_000 },
  removeOnComplete: true,
  removeOnFail: 50,
};

@Injectable()
export class EmailEventsListener {
  constructor(@InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue) {}

  @OnEvent('auth.email-verification-requested')
  async onEmailVerificationRequested(event: EmailVerificationRequestedEvent): Promise<void> {
    await this.emailQueue.add(
      EmailJobName.VERIFICATION,
      { to: event.email, token: event.token },
      EMAIL_JOB_OPTIONS,
    );
  }

  @OnEvent('auth.password-reset-requested')
  async onPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    await this.emailQueue.add(
      EmailJobName.PASSWORD_RESET,
      { to: event.email, token: event.token },
      EMAIL_JOB_OPTIONS,
    );
  }
}
