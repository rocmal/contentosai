import { Logger, NotFoundException } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ContentService } from '@modules/content/application/services/content.service';
import { NotificationsService } from '@modules/notifications/application/services/notifications.service';
import { NotificationType } from '@modules/notifications/domain/entities/notification.entity';
import { IntegrationsService } from '@modules/integrations/application/services/integrations.service';
import { PublishingJobsService } from '@modules/publishing/application/services/publishing-jobs.service';
import { PublishingJobStatus } from '@modules/publishing/domain/entities/publishing-job.entity';
import { SocialPublisherFactory } from '@modules/publishing/infrastructure/social-publisher.factory';
import { QueueName } from '../queue-names';

interface PublishScheduledPostJobData {
  publishingJobId: string;
}

interface PublishableContentMetadata {
  videoUrl?: string;
  caption?: string;
  text?: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

function platformName(platform: string): string {
  return PLATFORM_NAMES[platform] ?? platform;
}

/**
 * Fires when a scheduled post's time arrives (enqueued as a delayed BullMQ
 * job by SocialPublishEventsListener). Resolves the workspace's connected
 * platform credentials and the content's stored video/text, then delegates
 * the actual platform call to ISocialPublisher so this processor stays
 * platform-agnostic - each provider validates what it specifically needs.
 */
@Processor(QueueName.SOCIAL_PUBLISH)
export class SocialPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(SocialPublishProcessor.name);

  constructor(
    private readonly publishingJobsService: PublishingJobsService,
    private readonly integrationsService: IntegrationsService,
    private readonly contentService: ContentService,
    private readonly socialPublisherFactory: SocialPublisherFactory,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<PublishScheduledPostJobData>): Promise<void> {
    const { publishingJobId } = job.data;

    const publishingJob = await this.loadPendingJob(publishingJobId);
    if (!publishingJob) {
      return;
    }

    try {
      if (!publishingJob.contentId) {
        throw new Error('Publishing job has no associated content/video');
      }

      const content = await this.contentService.findById(publishingJob.contentId);
      const metadata = (content.metadata ?? null) as PublishableContentMetadata | null;
      // AI Studio's generated text lives in content.body, not metadata - only
      // video posts (Video Studio's schedulePost) put anything in metadata.
      const text = metadata?.text ?? (content.type === 'text' ? content.body : undefined);
      if (!metadata?.videoUrl && !text) {
        throw new Error('Content has no video or text to publish');
      }

      const credentials = await this.integrationsService.getDecryptedCredentials(
        publishingJob.workspaceId,
        publishingJob.platform,
      );
      if (!credentials) {
        throw new Error(`No connected "${publishingJob.platform}" account for this workspace`);
      }

      const publisher = this.socialPublisherFactory.getPublisher(publishingJob.platform);
      const result = await publisher.publish({
        videoUrl: metadata?.videoUrl,
        text,
        caption: metadata?.caption ?? content.title,
        credentials,
      });

      await this.publishingJobsService.updateAsSystem(publishingJobId, {
        status: PublishingJobStatus.PUBLISHED,
        publishedAt: new Date().toISOString(),
        externalPostId: result.externalPostId,
        permalink: result.permalink,
      });
      await this.notify(publishingJob.createdBy, {
        title: `Posted to ${platformName(publishingJob.platform)}`,
        message: `"${content.title}" is live.`,
        type: NotificationType.SUCCESS,
        metadata: { link: 'calendar', publishingJobId, permalink: result.permalink ?? null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown publishing error';
      this.logger.error(`Publishing job ${publishingJobId} failed: ${message}`);
      await this.publishingJobsService.updateAsSystem(publishingJobId, {
        status: PublishingJobStatus.FAILED,
      });
      await this.notify(publishingJob.createdBy, {
        title: `${platformName(publishingJob.platform)} post failed`,
        message,
        type: NotificationType.ERROR,
        metadata: { link: 'calendar', publishingJobId },
      });
      throw error;
    }
  }

  /** Tells the person who scheduled the post (in-app and push). Never fails the job. */
  private async notify(
    userId: string | null,
    input: { title: string; message: string; type: NotificationType; metadata: Record<string, unknown> },
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.notificationsService.create({ userId, ...input });
    } catch (error) {
      this.logger.warn(`Could not create notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Returns null (and logs) instead of throwing when the job was cancelled
   * (soft-deleted) or already handled - a delayed job outliving its target
   * row is expected, not an error worth retrying. */
  private async loadPendingJob(publishingJobId: string) {
    try {
      const publishingJob = await this.publishingJobsService.findById(publishingJobId);
      return publishingJob.status === PublishingJobStatus.SCHEDULED ? publishingJob : null;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Publishing job ${publishingJobId} no longer exists - skipping`);
        return null;
      }
      throw error;
    }
  }
}
