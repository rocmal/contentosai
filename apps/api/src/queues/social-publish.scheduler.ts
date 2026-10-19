import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName, SocialPublishJobName } from './queue-names';

/** Registers the daily "which LinkedIn connections run out soon" check (ConnectionExpiryReminderService) once at boot.
 * Repeatable jobs are keyed by name+pattern, so adding it again on every restart is a no-op. */
@Injectable()
export class SocialPublishScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SocialPublishScheduler.name);

  constructor(@InjectQueue(QueueName.SOCIAL_PUBLISH) private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    // 03:30 UTC is 9:00 in India.
    await this.queue.add(
      SocialPublishJobName.CHECK_CONNECTIONS,
      {},
      { repeat: { pattern: '30 3 * * *' }, removeOnComplete: true, removeOnFail: 20 },
    );
    this.logger.log('LinkedIn connection expiry check scheduled (daily)');
  }
}
