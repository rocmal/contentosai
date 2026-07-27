import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { VideoService } from '@modules/video/application/services/video.service';
import { VideoGenerationResult } from '@modules/video/domain/interfaces/video-provider.interface';
import { QueueName } from '../queue-names';

interface PollVideoJobData {
  provider: string;
  jobId: string;
  attempt?: number;
}

const MAX_POLL_ATTEMPTS = 30;
const POLL_DELAY_MS = 10_000;
const POLL_JOB_NAME = 'poll-video-job';

/** Video generation is asynchronous vendor-side, so this worker polls a
 * submitted job's status and re-queues itself with a delay until the vendor
 * reports completion/failure or the attempt budget is exhausted. */
@Processor(QueueName.VIDEO)
export class VideoProcessor extends WorkerHost {
  constructor(
    private readonly videoService: VideoService,
    @InjectQueue(QueueName.VIDEO) private readonly videoQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PollVideoJobData>): Promise<VideoGenerationResult> {
    const { provider, jobId, attempt = 0 } = job.data;
    const result = await this.videoService.getJobStatus(provider, jobId);

    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }

    if (attempt >= MAX_POLL_ATTEMPTS) {
      return { ...result, status: 'failed' };
    }

    await this.videoQueue.add(
      POLL_JOB_NAME,
      { provider, jobId, attempt: attempt + 1 },
      { delay: POLL_DELAY_MS },
    );
    return result;
  }
}
