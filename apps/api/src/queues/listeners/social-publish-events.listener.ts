import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PublishingJobCreatedEvent } from '@modules/publishing/application/events/publishing-job-created.event';
import { PublishingJobStatus } from '@modules/publishing/domain/entities/publishing-job.entity';
import { QueueName, SocialPublishJobName } from '../queue-names';

/**
 * Bridges "a publishing job was created" to "actually publish it at the
 * right time". PublishingJobsService has no knowledge of BullMQ - it just
 * emits a domain event; this listener decides whether/when that translates
 * into a durable delayed job.
 */
@Injectable()
export class SocialPublishEventsListener {
  constructor(@InjectQueue(QueueName.SOCIAL_PUBLISH) private readonly socialPublishQueue: Queue) {}

  @OnEvent('publishing.created')
  async onPublishingJobCreated(event: PublishingJobCreatedEvent): Promise<void> {
    if (event.status !== PublishingJobStatus.SCHEDULED || !event.scheduledAt) {
      return;
    }

    const delay = Math.max(0, new Date(event.scheduledAt).getTime() - Date.now());
    await this.socialPublishQueue.add(
      SocialPublishJobName.PUBLISH,
      { publishingJobId: event.publishingJobId },
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
    );
  }
}
