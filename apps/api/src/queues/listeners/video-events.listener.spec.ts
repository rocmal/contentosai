import { Queue } from 'bullmq';
import { VideoJobSubmittedEvent } from '@modules/video/application/events/video-job-submitted.event';
import { VideoJobName } from '../queue-names';
import { VideoEventsListener } from './video-events.listener';

describe('VideoEventsListener', () => {
  let listener: VideoEventsListener;
  let videoQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    videoQueue = { add: jest.fn() } as unknown as jest.Mocked<Queue>;
    listener = new VideoEventsListener(videoQueue);
  });

  it('enqueues the first poll job with the full actor context and attempt 0', async () => {
    const event = new VideoJobSubmittedEvent('runway', 'job-1', 'user-1', 'org-1', 'workspace-1');

    await listener.onVideoJobSubmitted(event);

    expect(videoQueue.add).toHaveBeenCalledWith(
      VideoJobName.POLL,
      {
        provider: 'runway',
        jobId: 'job-1',
        attempt: 0,
        userId: 'user-1',
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
      },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('still enqueues a poll job when the actor has no tenant context yet (VideoService.getJobStatus handles that gate itself)', async () => {
    const event = new VideoJobSubmittedEvent('runway', 'job-2');

    await listener.onVideoJobSubmitted(event);

    expect(videoQueue.add).toHaveBeenCalledWith(
      VideoJobName.POLL,
      expect.objectContaining({ provider: 'runway', jobId: 'job-2', userId: undefined }),
      expect.anything(),
    );
  });
});
