import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreditsService,
  InsufficientCreditsException,
} from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { VideoProviderFactory } from '../../infrastructure/video-provider.factory';
import {
  IVideoProvider,
  VideoGenerationResult,
} from '../../domain/interfaces/video-provider.interface';
import { GenerateVideoDto } from '../dto/generate-video.dto';
import { VideoJobSubmittedEvent } from '../events/video-job-submitted.event';
import { VideoService } from './video.service';

describe('VideoService', () => {
  let service: VideoService;
  let providerFactory: jest.Mocked<VideoProviderFactory>;
  let storageService: jest.Mocked<StorageService>;
  let mediaAssetsService: jest.Mocked<MediaAssetsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let creditsService: jest.Mocked<CreditsService>;
  let provider: jest.Mocked<IVideoProvider>;

  const actor = { userId: 'user-1', organizationId: 'org-1', workspaceId: 'workspace-1' };

  const completedResult: VideoGenerationResult = {
    provider: 'runway',
    model: 'gen-3',
    jobId: 'job-1',
    status: 'completed',
    videoUrl: 'https://vendor.example.com/job-1.mp4',
  };

  beforeEach(() => {
    provider = {
      name: 'runway',
      submitJob: jest.fn(),
      getJobStatus: jest.fn(),
    };
    providerFactory = {
      getProvider: jest.fn().mockReturnValue(provider),
      listProviders: jest.fn(),
    } as unknown as jest.Mocked<VideoProviderFactory>;
    storageService = {
      uploadFile: jest.fn().mockResolvedValue({
        key: 'gallery/videos/job-1.mp4',
        url: 'https://cdn.example.com/gallery/videos/job-1.mp4',
      }),
    } as unknown as jest.Mocked<StorageService>;
    mediaAssetsService = {
      findCached: jest.fn().mockResolvedValue(null),
      saveGenerated: jest.fn().mockResolvedValue({ id: 'asset-1' }),
    } as unknown as jest.Mocked<MediaAssetsService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    creditsService = {
      reserve: jest.fn(),
      refund: jest.fn(),
    } as unknown as jest.Mocked<CreditsService>;

    service = new VideoService(
      providerFactory,
      storageService,
      mediaAssetsService,
      eventEmitter,
      creditsService,
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'video/mp4' },
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;
  });

  describe('getJobStatus', () => {
    it('does not attempt to persist a job that is still in progress', async () => {
      provider.getJobStatus.mockResolvedValue({
        ...completedResult,
        status: 'processing',
        videoUrl: undefined,
      });

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(result.status).toBe('processing');
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not persist a completed job when the actor has no organization/workspace yet', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);

      const result = await service.getJobStatus('runway', 'job-1', {
        userId: 'user-1',
        organizationId: null,
        workspaceId: null,
      });

      expect(result).toEqual(completedResult);
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('downloads, re-hosts, and saves a newly-completed video to the gallery', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(global.fetch).toHaveBeenCalledWith(completedResult.videoUrl);
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'video/mp4' }),
        'gallery/videos',
      );
      expect(mediaAssetsService.saveGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
          type: MediaAssetType.VIDEO,
          provider: 'runway',
          model: 'gen-3',
          url: 'https://cdn.example.com/gallery/videos/job-1.mp4',
        }),
        'user-1',
      );
      // Our own storage URL replaces the vendor's (possibly expiring) one.
      expect(result.videoUrl).toBe('https://cdn.example.com/gallery/videos/job-1.mp4');
      // The app reads this and does not save a second copy.
      expect(result.savedToGallery).toBe(true);
    });

    it('serves the cached asset on a repeat poll instead of re-downloading', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);
      mediaAssetsService.findCached.mockResolvedValue({
        url: 'https://cdn.example.com/already-saved.mp4',
      } as never);

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(result.videoUrl).toBe('https://cdn.example.com/already-saved.mp4');
      expect(result.savedToGallery).toBe(true);
    });

    it('returns the original result instead of throwing when persistence fails', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(result).toEqual(completedResult);
      // Not in the Gallery, so the app still offers to save it.
      expect(result.savedToGallery).toBeUndefined();
    });
  });

  describe('submitJob', () => {
    const dto: GenerateVideoDto = { prompt: 'a cat', provider: 'runway', durationSeconds: 10 };

    it('emits video.job-submitted with the full actor context, so the queue listener can seed server-side polling', async () => {
      provider.submitJob.mockResolvedValue({
        provider: 'runway',
        model: 'gen-3',
        jobId: 'job-2',
        status: 'processing',
      });

      await service.submitJob(dto, actor);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'video.job-submitted',
        expect.any(VideoJobSubmittedEvent),
      );
      const [, event] = eventEmitter.emit.mock.calls[0] as [string, VideoJobSubmittedEvent];
      expect(event).toMatchObject({
        provider: 'runway',
        jobId: 'job-2',
        userId: 'user-1',
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
      });
    });

    it('still emits the event (with undefined org/workspace) when the actor has no tenant context yet', async () => {
      provider.submitJob.mockResolvedValue({
        provider: 'runway',
        model: 'gen-3',
        jobId: 'job-3',
        status: 'processing',
      });

      await service.submitJob(dto, { userId: 'user-1' });

      const [, event] = eventEmitter.emit.mock.calls[0] as [string, VideoJobSubmittedEvent];
      expect(event.organizationId).toBeUndefined();
      expect(event.workspaceId).toBeUndefined();
    });

    it('charges nothing for the free test engine, and the full rate for an engine it does not list', async () => {
      provider.submitJob.mockResolvedValue({
        provider: 'mock',
        model: 'mock',
        jobId: 'job-4',
        status: 'processing',
      });

      await service.submitJob({ ...dto, provider: 'mock' }, actor);
      expect(creditsService.reserve).not.toHaveBeenCalled();

      await service.submitJob({ ...dto, provider: 'runway' }, actor);
      expect(creditsService.reserve).toHaveBeenCalledWith(expect.objectContaining({ amount: 180 }));
    });

    it('tells the poller what the job cost, so a clip that never arrives can be refunded', async () => {
      provider.submitJob.mockResolvedValue({
        provider: 'runway',
        model: 'gen-3',
        jobId: 'job-5',
        status: 'processing',
      });

      await service.submitJob(dto, actor);
      await service.submitJob({ ...dto, provider: 'mock' }, actor);

      const costs = eventEmitter.emit.mock.calls.map(
        ([, event]) => (event as VideoJobSubmittedEvent).creditsCharged,
      );
      expect(costs).toEqual([180, 0]);
    });

    describe('reusing a saved clip', () => {
      const submitted = {
        provider: 'runway',
        model: 'gen-3',
        jobId: 'job-9',
        status: 'processing' as const,
      };

      it('returns the earlier clip for the same prompt without charging or calling the provider', async () => {
        mediaAssetsService.findCached.mockResolvedValue({
          url: 'https://cdn.example.com/old.mp4',
          model: 'gen-3',
        } as never);

        const result = await service.submitJob(dto, actor);

        expect(result).toMatchObject({
          status: 'completed',
          cached: true,
          savedToGallery: true,
          videoUrl: 'https://cdn.example.com/old.mp4',
        });
        expect(creditsService.reserve).not.toHaveBeenCalled();
        expect(provider.submitJob).not.toHaveBeenCalled();
        expect(eventEmitter.emit).not.toHaveBeenCalled();
      });

      it('treats extra spaces and letter case as the same prompt, but a different length as a new one', async () => {
        provider.submitJob.mockResolvedValue(submitted);
        const first = await service.submitJob(dto, actor);
        const same = await service.submitJob({ ...dto, prompt: '  A   CAT ' }, actor);
        const longer = await service.submitJob({ ...dto, durationSeconds: 5 }, actor);

        expect(same.cacheKey).toBe(first.cacheKey);
        expect(longer.cacheKey).not.toBe(first.cacheKey);
      });

      it('renders a new version, and charges for it, when asked to skip the saved clip', async () => {
        mediaAssetsService.findCached.mockResolvedValue({
          url: 'https://cdn.example.com/old.mp4',
        } as never);
        provider.submitJob.mockResolvedValue(submitted);

        const result = await service.submitJob({ ...dto, fresh: true }, actor);

        expect(result.cached).toBeUndefined();
        expect(creditsService.reserve).toHaveBeenCalled();
        expect(provider.submitJob).toHaveBeenCalled();
      });

      it('saves the finished clip under the prompt signature so the next identical prompt hits it', async () => {
        provider.getJobStatus.mockResolvedValue(completedResult);

        await service.getJobStatus('runway', 'job-1', { ...actor, cacheKey: 'a'.repeat(64) });

        expect(mediaAssetsService.saveGenerated).toHaveBeenCalledWith(
          expect.objectContaining({ cacheKeyHash: 'a'.repeat(64) }),
          'user-1',
        );
      });

      it('keeps the prompt with the saved clip, and passes it to the background poller', async () => {
        provider.submitJob.mockResolvedValue(submitted);
        provider.getJobStatus.mockResolvedValue(completedResult);

        await service.submitJob(dto, actor);
        const [, event] = eventEmitter.emit.mock.calls[0] as [string, VideoJobSubmittedEvent];
        expect(event.prompt).toBe('a cat');

        await service.getJobStatus('runway', 'job-1', { ...actor, prompt: 'a cat' });
        expect(mediaAssetsService.saveGenerated).toHaveBeenCalledWith(
          expect.objectContaining({ prompt: 'a cat' }),
          'user-1',
        );
      });

      it('fills in the prompt on a clip the browser saved first, without overwriting one that has it', async () => {
        provider.getJobStatus.mockResolvedValue(completedResult);
        const setPromptIfMissing = jest.fn().mockResolvedValue(undefined);
        (mediaAssetsService as unknown as { setPromptIfMissing: jest.Mock }).setPromptIfMissing =
          setPromptIfMissing;
        mediaAssetsService.findCached.mockResolvedValue({
          id: 'asset-9',
          url: 'https://cdn.example.com/a.mp4',
          prompt: null,
        } as never);

        await service.getJobStatus('runway', 'job-1', { ...actor, prompt: 'a cat' });
        expect(setPromptIfMissing).toHaveBeenCalledWith('asset-9', 'a cat');

        setPromptIfMissing.mockClear();
        mediaAssetsService.findCached.mockResolvedValue({
          id: 'asset-9',
          url: 'https://cdn.example.com/a.mp4',
          prompt: 'earlier',
        } as never);
        await service.getJobStatus('runway', 'job-1', { ...actor, prompt: 'a cat' });
        expect(setPromptIfMissing).not.toHaveBeenCalled();
      });

      it('passes the signature to the background poller through the event', async () => {
        provider.submitJob.mockResolvedValue(submitted);

        const result = await service.submitJob(dto, actor);

        const [, event] = eventEmitter.emit.mock.calls[0] as [string, VideoJobSubmittedEvent];
        expect(event.cacheKey).toBe(result.cacheKey);
        expect(result.cacheKey).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('refundFailedJob', () => {
    it('returns what the job cost to its workspace', async () => {
      await expect(
        service.refundFailedJob({ jobId: 'job-1', ...actor, creditsCharged: 180 }),
      ).resolves.toBe(180);

      expect(creditsService.refund).toHaveBeenCalledWith({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        amount: 180,
        userId: 'user-1',
      });
    });

    it('refunds nothing for a free job or one without a workspace', async () => {
      await expect(
        service.refundFailedJob({ jobId: 'job-1', ...actor, creditsCharged: 0 }),
      ).resolves.toBe(0);
      await expect(service.refundFailedJob({ jobId: 'job-1', ...actor })).resolves.toBe(0);
      await expect(
        service.refundFailedJob({ jobId: 'job-1', userId: 'user-1', creditsCharged: 180 }),
      ).resolves.toBe(0);

      expect(creditsService.refund).not.toHaveBeenCalled();
    });
  });

  describe('chargeSceneVideo', () => {
    const projectId = '11111111-1111-4111-8111-111111111111';

    it('charges 20 credits as video, kept with the draft it was made from', async () => {
      await expect(service.chargeSceneVideo({ ...actor, projectId })).resolves.toEqual({
        creditsCharged: 20,
      });

      expect(creditsService.reserve).toHaveBeenCalledWith({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        amount: 20,
        reason: CreditTransactionReason.GENERATION_VIDEO,
        userId: 'user-1',
        relatedEntityId: projectId,
      });
    });

    it('passes on "not enough credits", so the browser does not show the video', async () => {
      creditsService.reserve.mockRejectedValue(new InsufficientCreditsException());

      await expect(service.chargeSceneVideo(actor)).rejects.toBeInstanceOf(
        InsufficientCreditsException,
      );
    });

    it('refuses an account without a workspace', async () => {
      await expect(
        service.chargeSceneVideo({ userId: 'user-1', organizationId: null, workspaceId: null }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(creditsService.reserve).not.toHaveBeenCalled();
    });
  });
});
