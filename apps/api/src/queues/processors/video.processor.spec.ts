import { Job, Queue } from 'bullmq';
import { VideoService } from '@modules/video/application/services/video.service';
import { NotificationsService } from '@modules/notifications/application/services/notifications.service';
import { VideoJobName } from '../queue-names';
import { MAX_POLL_ATTEMPTS, PollVideoJobData, VideoProcessor } from './video.processor';

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
    videoService = {
      getJobStatus: jest.fn(),
      refundFailedJob: jest
        .fn()
        .mockImplementation((data: PollVideoJobData) => Promise.resolve(data.creditsCharged ?? 0)),
    } as unknown as jest.Mocked<VideoService>;
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

  it('keeps collecting a slow clip well past five minutes', async () => {
    videoService.getJobStatus.mockResolvedValue({
      provider: 'veo',
      model: 'veo-3.1',
      jobId: 'job-1',
      status: 'processing',
    });

    await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 30, ...actor }));

    // 10 s apart: at least 20 minutes before giving up.
    expect(MAX_POLL_ATTEMPTS * 10).toBeGreaterThanOrEqual(20 * 60);
    expect(videoQueue.add).toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('gives up once the attempt budget is exhausted, marking the result failed instead of re-queuing forever', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'runway', model: 'gen-3', jobId: 'job-1', status: 'processing' });

    const result = await processor.process(makeJob({ provider: 'runway', jobId: 'job-1', attempt: MAX_POLL_ATTEMPTS, ...actor }));

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

    await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: MAX_POLL_ATTEMPTS, ...actor }));

    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('still finishes the job when the notification cannot be saved', async () => {
    videoService.getJobStatus.mockResolvedValue({ provider: 'veo', model: 'veo-3.1', jobId: 'job-1', status: 'completed' });
    notificationsService.create.mockRejectedValue(new Error('db down'));

    const result = await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...actor }));

    expect(result.status).toBe('completed');
  });

  describe('refunds', () => {
    const paid = { ...actor, creditsCharged: 180 };
    const veo = (status: 'completed' | 'failed' | 'processing') => ({
      provider: 'veo',
      model: 'veo-3.1',
      jobId: 'job-1',
      status,
    });

    it('returns the credits when the video service reports a failed or blocked clip', async () => {
      videoService.getJobStatus.mockResolvedValue(veo('failed'));

      await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 3, ...paid }));

      expect(videoService.refundFailedJob).toHaveBeenCalledTimes(1);
      expect(videoService.refundFailedJob).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-1', creditsCharged: 180, ...actor }),
      );
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Your 180 credits were returned'),
        }),
      );
    });

    it('returns the credits when the clip never arrives', async () => {
      videoService.getJobStatus.mockResolvedValue(veo('processing'));

      await processor.process(
        makeJob({ provider: 'veo', jobId: 'job-1', attempt: MAX_POLL_ATTEMPTS, ...paid }),
      );

      expect(videoService.refundFailedJob).toHaveBeenCalledTimes(1);
    });

    it('never refunds a finished clip or one still rendering', async () => {
      videoService.getJobStatus.mockResolvedValueOnce(veo('completed'));
      await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...paid }));
      videoService.getJobStatus.mockResolvedValueOnce(veo('processing'));
      await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 5, ...paid }));

      expect(videoService.refundFailedJob).not.toHaveBeenCalled();
    });

    it('carries the cost to the next poll', async () => {
      videoService.getJobStatus.mockResolvedValue(veo('processing'));

      await processor.process(makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...paid }));

      expect(videoQueue.add).toHaveBeenCalledWith(
        VideoJobName.POLL,
        expect.objectContaining({ creditsCharged: 180, attempt: 1 }),
        expect.anything(),
      );
    });

    it('keeps polling when a status check errors, instead of ending with no clip, notice or refund', async () => {
      videoService.getJobStatus.mockRejectedValue(new Error('Could not check the video status'));

      const result = await processor.process(
        makeJob({ provider: 'veo', jobId: 'job-1', attempt: 4, ...paid }),
      );

      expect(result.status).toBe('processing');
      expect(videoQueue.add).toHaveBeenCalledWith(
        VideoJobName.POLL,
        expect.objectContaining({ attempt: 5 }),
        expect.anything(),
      );
      expect(videoService.refundFailedJob).not.toHaveBeenCalled();
    });

    it('still ends the job, without retrying the refund, when the refund cannot be saved', async () => {
      videoService.getJobStatus.mockResolvedValue(veo('failed'));
      videoService.refundFailedJob.mockRejectedValue(new Error('db down'));

      const result = await processor.process(
        makeJob({ provider: 'veo', jobId: 'job-1', attempt: 0, ...paid }),
      );

      expect(result.status).toBe('failed');
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Generation failed on the video service. Open Video Studio to try again.',
        }),
      );
    });
  });
});
