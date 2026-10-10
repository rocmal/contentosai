import { Job, Queue } from 'bullmq';
import { VideoService } from '@modules/video/application/services/video.service';
import { NotificationsService } from '@modules/notifications/application/services/notifications.service';
import { VideoJobName } from '../queue-names';
import { PollVideoJobData, VideoProcessor } from './video.processor';

describe('VideoProcessor', () => {
  let processor: VideoProcessor;
  let videoService: jest.Mocked<VideoService>;
  let videoQueue: jest.Mocked<Queue>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const actor = { userId: 'user-1', organizationId: 'org-1', workspaceId: 'workspace-1' };

  function makeJob(data: PollVideoJobData): Job<PollVideoJobData> {
    return { data } as Job<PollVideoJobData>;
  }

  beforeEach(() => {
    videoService = { getJobStatus: jest.fn() } as unknown as jest.Mocked<VideoService>;
    videoQueue = { add: jest.fn() } as unknown as jest.Mocked<Queue>;
    notificationsService = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<NotificationsService>;
    processor = new VideoProcessor(videoService, videoQueue, notificationsService);
  });

  it('passes the job data actor context through to VideoService.getJobStatus (the persistence gate)', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'runway', model: 'gen-3', jobId: 'job-1', status: 'completed' });

    await processor.process(makeJob({ provider: 'runway', jobId: 'job-1', attempt: 0, ...actor }));

    expect(videoService.getJobStatus).toHaveBeenCalledWith('runway', 'job-1', actor);
  });

  it('returns immediately on completed without re-queuing', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'runway', model: 'gen-3', jobId: 'job-1', status: 'completed' });

    await processor.process(makeJob({ provider: 'runway', jobId: 'job-1', attempt: 0, ...actor }));

    expect(videoQueue.add).not.toHaveBeenCalled();
  });

  it('returns immediately on failed without re-queuing', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'runway', model: 'gen-3', jobId: 'job-1', status: 'failed' });

    await processor.process(makeJob({ provider: 'runway', jobId: 'job-1', attempt: 0, ...actor }));

    expect(videoQueue.add).not.toHaveBeenCalled();
  });

  it('re-queues with the attempt incremented and the same actor context carried forward while still processing', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'runway', model: 'gen-3', jobId: 'job-1', status: 'processing' });

    await processor.process(makeJob({ provider: 'runway', jobId: 'job-1', attempt: 2, ...actor }));

    expect(videoQueue.add).toHaveBeenCalledWith(
      VideoJobName.POLL,
      { provider: 'runway', jobId: 'job-1', attempt: 3, ...actor },
      expect.objectContaining({ delay: expect.any(Number), attempts: 3 }),
    );
  });

  it('gives up once the attempt budget is exhausted, marking the result failed instead of re-queuing forever', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'runway', model: 'gen-3', jobId: 'job-1', status: 'processing' });

    const result = await processor.process(makeJob({ provider: 'runway', jobId: 'job-1', attempt: 30, ...actor }));

    expect(result.status).toBe('failed');
    expect(videoQueue.add).not.toHaveBeenCalled();
  });

  it('tells the person when their video is ready, pointing at the gallery', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'veo', model: 'veo-3.1', jobId: 'job-1', status: 'completed' });

    await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...actor }));

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'success', metadata: { link: 'gallery' } }),
    );
  });

  it('does not notify for a reused clip, which the person already has', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'veo', model: 'veo-3.1', jobId: 'job-1', status: 'completed', cached: true });

    await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...actor }));

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('notifies on failure and when the attempt budget runs out', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'veo', model: 'veo-3.1', jobId: 'job-1', status: 'processing' });

    await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 30, ...actor }));

    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('still finishes the job when the notification cannot be saved', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'veo', model: 'veo-3.1', jobId: 'job-1', status: 'completed' });
    notificationsService.create.mockRejectedValue(new Error('db down'));

    const result = await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...actor }));

    expect(result.status).toBe('completed');
  });
});
