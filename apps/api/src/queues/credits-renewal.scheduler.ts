import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName, CreditsRenewalJobName } from './queue-names';

/** Registers the recurring "check for subscriptions due for credit renewal"
 * job once at boot. BullMQ repeatable jobs are keyed by name+pattern, so
 * calling add() again on every restart is a no-op if the job is already
 * scheduled - safe to run on every deploy/dev-server restart. */
@Injectable()
export class CreditsRenewalScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CreditsRenewalScheduler.name);

  constructor(@InjectQueue(QueueName.CREDITS_RENEWAL) private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      CreditsRenewalJobName.CHECK,
      {},
      { repeat: { pattern: '0 */6 * * *' }, removeOnComplete: true, removeOnFail: 50 },
    );
    this.logger.log('Credits renewal check scheduled (every 6 hours)');
  }
}
