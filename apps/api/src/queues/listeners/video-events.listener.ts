import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VideoJobSubmittedEvent } from '@modules/video/application/events/video-job-submitted.event';
import { PollVideoJobData } from '../processors/video.processor';
import { QueueName, VideoJobName } from '../queue-names';

const RETRY_OPTIONS = { attempts: 3, backoff: { type: 'exponential' as const, delay: 5_000 } };

/**
 * Bridges "a video generation job was submitted" to the durable server-side
 * poller. Before this listener existed, nothing anywhere ever added a job
 * to QueueName.VIDEO, so VideoProcessor was registered but never actually
 * ran - video completion was only ever detected by the frontend's own
 * client-side polling (VideoController#getJobStatus). A closed tab or a
 * dropped connection meant a clip the vendor had already finished never got
 * persisted to the gallery. This listener is the missing first link: it
 * seeds the poll chain, VideoProcessor keeps it going.
 */
@Injectable()
export class VideoEventsListener {
  constructor(@InjectQueue(QueueName.VIDEO) private readonly videoQueue: Queue) {}

  @OnEvent('video.job-submitted')
  async onVideoJobSubmitted(event: VideoJobSubmittedEvent): Promise<void> {
    const data: PollVideoJobData = {
      provider: event.provider,
      jobId: event.jobId,
      attempt: 0,
      userId: event.userId,
      organizationId: event.organizationId,
      workspaceId: event.workspaceId,
    };
    await this.videoQueue.add(VideoJobName.POLL, data, RETRY_OPTIONS);
  }
}
