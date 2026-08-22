import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { VideoService } from '@modules/video/application/services/video.service';
import { VideoGenerationResult } from '@modules/video/domain/interfaces/video-provider.interface';
import { QueueName, VideoJobName } from '../queue-names';

export interface PollVideoJobData {
  provider: string;
  jobId: string;
  attempt?: number;
  /** Carried through every poll/re-queue so a completed clip can be
   * persisted to the gallery independently of whether the submitting
   * client is still around to see it - see VideoEventsListener, which
   * seeds this from the same VideoJobSubmittedEvent VideoService emits. */
  userId?: string;
  organizationId?: string | null;
  workspaceId?: string | null;
}

const MAX_POLL_ATTEMPTS = 30;
const POLL_DELAY_MS = 10_000;
const RETRY_OPTIONS = { attempts: 3, backoff: { type: 'exponential' as const, delay: 5_000 } };

/** Video generation is asynchronous vendor-side, so this worker polls a
 * submitted job's status and re-queues itself with a delay until the vendor
 * reports completion/failure or the attempt budget is exhausted. The actual
 * "persist a completed clip to the gallery" logic lives in
 * VideoService.getJobStatus, not here - this worker and the frontend's own
 * polling (VideoController#getJobStatus) both call that same method, so
 * whichever one observes "completed" first persists it, and the other gets
 * the idempotent cached result via VideoService's findCached check. */
@Processor(QueueName.VIDEO)
export class VideoProcessor extends WorkerHost {
  constructor(
    private readonly videoService: VideoService,
    @InjectQueue(QueueName.VIDEO) private readonly videoQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PollVideoJobData>): Promise<VideoGenerationResult> {
    const { provider, jobId, attempt = 0, userId, organizationId, workspaceId } = job.data;
    const result = await this.videoService.getJobStatus(provider, jobId, { userId, organizationId, workspaceId });

    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }

    if (attempt >= MAX_POLL_ATTEMPTS) {
      return { ...result, status: 'failed' };
    }

    await this.videoQueue.add(
      VideoJobName.POLL,
      { provider, jobId, attempt: attempt + 1, userId, organizationId, workspaceId },
      { delay: POLL_DELAY_MS, ...RETRY_OPTIONS },
    );
    return result;
  }
}
