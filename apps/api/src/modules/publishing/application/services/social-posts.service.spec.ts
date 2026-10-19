import { ContentService } from '@modules/content/application/services/content.service';
import { ContentType } from '@modules/content/domain/entities/content.entity';
import { IntegrationsService } from '@modules/integrations/application/services/integrations.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAsset, MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { PublishingJob } from '../../domain/entities/publishing-job.entity';
import { PublishingJobsService } from './publishing-jobs.service';
import { SocialPostActor, SocialPostsService } from './social-posts.service';

describe('SocialPostsService', () => {
  const actor: SocialPostActor = {
    id: 'u1',
    organizationId: 'o1',
    workspaceId: 'w1',
    roles: ['member'],
  };
  const linkedIn = {
    authorUrn: 'urn:li:person:1',
    accessToken: 't',
    expiresAt: Date.now() + 30 * 86_400_000,
  };
  const image = {
    id: 'img-1',
    type: MediaAssetType.IMAGE,
    url: 'https://cdn/x.jpg',
    fileName: 'Diwali offer.jpg',
  };
  const video = {
    id: 'vid-1',
    type: MediaAssetType.VIDEO,
    url: 'https://cdn/v.mp4',
    fileName: 'Reel.mp4',
  };

  let jobs: jest.Mocked<Pick<PublishingJobsService, 'create'>>;
  let content: jest.Mocked<Pick<ContentService, 'create'>>;
  let media: jest.Mocked<Pick<MediaAssetsService, 'findForActor'>>;
  let integrations: jest.Mocked<Pick<IntegrationsService, 'getDecryptedCredentials'>>;
  let service: SocialPostsService;

  beforeEach(() => {
    jobs = {
      create: jest
        .fn()
        .mockImplementation((dto) =>
          Promise.resolve({ id: `job-${dto.platform}`, ...dto } as PublishingJob),
        ),
    };
    content = { create: jest.fn().mockResolvedValue({ id: 'content-1' }) };
    media = { findForActor: jest.fn() };
    integrations = { getDecryptedCredentials: jest.fn().mockResolvedValue(linkedIn) };
    service = new SocialPostsService(
      jobs as unknown as PublishingJobsService,
      content as unknown as ContentService,
      media as unknown as MediaAssetsService,
      integrations as unknown as IntegrationsService,
    );
  });

  it('posts text on its own to LinkedIn now', async () => {
    const before = Date.now();
    const created = await service.create(
      { text: '  Plan today.\nSecure tomorrow.  ', platforms: ['linkedin'] },
      actor,
    );

    expect(created.contentId).toBe('content-1');
    expect(content.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'w1',
        title: 'Plan today.',
        body: 'Plan today.\nSecure tomorrow.',
        type: ContentType.TEXT,
        metadata: { source: 'composer', caption: 'Plan today.\nSecure tomorrow.' },
      }),
      'u1',
    );
    const scheduledAt = new Date(jobs.create.mock.calls[0][0].scheduledAt!).getTime();
    expect(scheduledAt).toBeGreaterThanOrEqual(before);
    expect(scheduledAt).toBeLessThan(before + 5_000);
  });

  it('attaches a Gallery image of the workspace and schedules it', async () => {
    media.findForActor.mockResolvedValue(image as MediaAsset);
    const when = new Date(Date.now() + 3_600_000).toISOString();

    await service.create(
      { text: '', mediaAssetId: 'img-1', platforms: ['linkedin'], scheduledAt: when },
      actor,
    );

    expect(media.findForActor).toHaveBeenCalledWith(
      'img-1',
      expect.objectContaining({ workspaceId: 'w1' }),
    );
    expect(content.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Diwali offer',
        type: ContentType.IMAGE,
        metadata: {
          source: 'composer',
          caption: '',
          mediaAssetId: 'img-1',
          imageUrl: 'https://cdn/x.jpg',
        },
      }),
      'u1',
    );
    expect(jobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'linkedin', scheduledAt: when }),
      'u1',
    );
  });

  it('makes one job per account for a video', async () => {
    media.findForActor.mockResolvedValue(video as MediaAsset);
    await service.create(
      { text: 'New reel', mediaAssetId: 'vid-1', platforms: ['linkedin', 'youtube'] },
      actor,
    );
    expect(jobs.create.mock.calls.map(([dto]) => dto.platform)).toEqual(['linkedin', 'youtube']);
  });

  it('refuses what an account cannot post, before saving anything', async () => {
    await expect(service.create({ text: 'Hello', platforms: ['facebook'] }, actor)).rejects.toThrow(
      'Facebook needs a video',
    );
    media.findForActor.mockResolvedValue(image as MediaAsset);
    await expect(
      service.create({ text: 'Hi', mediaAssetId: 'img-1', platforms: ['instagram'] }, actor),
    ).rejects.toThrow('Instagram can only post a video from Lumora for now.');
    await expect(service.create({ text: '   ', platforms: ['linkedin'] }, actor)).rejects.toThrow(
      'Write something',
    );
    await expect(
      service.create({ text: 'x'.repeat(3001), platforms: ['linkedin'] }, actor),
    ).rejects.toThrow('LinkedIn takes up to 3,000 characters');
    expect(content.create).not.toHaveBeenCalled();
    expect(jobs.create).not.toHaveBeenCalled();
  });

  it('asks to connect or reconnect the account', async () => {
    integrations.getDecryptedCredentials.mockResolvedValueOnce(null);
    await expect(service.create({ text: 'Hi', platforms: ['linkedin'] }, actor)).rejects.toThrow(
      'Connect LinkedIn in Integrations first.',
    );

    integrations.getDecryptedCredentials.mockResolvedValueOnce({
      ...linkedIn,
      expiresAt: Date.now() - 1000,
    });
    await expect(service.create({ text: 'Hi', platforms: ['linkedin'] }, actor)).rejects.toThrow(
      /expired on/,
    );

    // Scheduled for after the sign-in runs out.
    integrations.getDecryptedCredentials.mockResolvedValueOnce({
      ...linkedIn,
      expiresAt: Date.now() + 3_600_000,
    });
    const later = new Date(Date.now() + 2 * 86_400_000).toISOString();
    await expect(
      service.create({ text: 'Hi', platforms: ['linkedin'], scheduledAt: later }, actor),
    ).rejects.toThrow(/runs out on .* before this post's time/);
  });

  it('refuses a time in the past and audio from the Gallery', async () => {
    await expect(
      service.create(
        {
          text: 'Hi',
          platforms: ['linkedin'],
          scheduledAt: new Date(Date.now() - 60_000).toISOString(),
        },
        actor,
      ),
    ).rejects.toThrow('Pick a time at least a minute from now');
    media.findForActor.mockResolvedValue({ ...image, type: MediaAssetType.AUDIO } as MediaAsset);
    await expect(
      service.create({ text: 'Hi', mediaAssetId: 'a', platforms: ['linkedin'] }, actor),
    ).rejects.toThrow('Only an image or a video');
  });
});
