import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { VideoProviderFactory } from '../../infrastructure/video-provider.factory';
import { IVideoProvider, VideoGenerationResult } from '../../domain/interfaces/video-provider.interface';
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
    providerFactory = { getProvider: jest.fn().mockReturnValue(provider), listProviders: jest.fn() } as unknown as jest.Mocked<VideoProviderFactory>;
    storageService = {
      uploadFile: jest.fn().mockResolvedValue({ key: 'gallery/videos/job-1.mp4', url: 'https://cdn.example.com/gallery/videos/job-1.mp4' }),
    } as unknown as jest.Mocked<StorageService>;
    mediaAssetsService = {
      findCached: jest.fn().mockResolvedValue(null),
      saveGenerated: jest.fn().mockResolvedValue({ id: 'asset-1' }),
    } as unknown as jest.Mocked<MediaAssetsService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    creditsService = { reserve: jest.fn(), refund: jest.fn() } as unknown as jest.Mocked<CreditsService>;

    service = new VideoService(providerFactory, storageService, mediaAssetsService, eventEmitter, creditsService);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'video/mp4' },
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;
  });

  describe('getJobStatus', () => {
    it('does not attempt to persist a job that is still in progress', async () => {
      provider.getJobStatus.mockResolvedValue({ ...completedResult, status: 'processing', videoUrl: undefined });

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(result.status).toBe('processing');
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not persist a completed job when the actor has no organization/workspace yet', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);

      const result = await service.getJobStatus('runway', 'job-1', { userId: 'user-1', organizationId: null, workspaceId: null });

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
    });

    it('serves the cached asset on a repeat poll instead of re-downloading', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);
      mediaAssetsService.findCached.mockResolvedValue({ url: 'https://cdn.example.com/already-saved.mp4' } as never);

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(result.videoUrl).toBe('https://cdn.example.com/already-saved.mp4');
    });

    it('returns the original result instead of throwing when persistence fails', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const result = await service.getJobStatus('runway', 'job-1', actor);

      expect(result).toEqual(completedResult);
    });
  });
});
