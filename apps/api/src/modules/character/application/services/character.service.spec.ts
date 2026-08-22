import { readFile } from 'fs/promises';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { CharacterProviderFactory } from '../../infrastructure/character-provider.factory';
import { CharacterGenerationResult, ICharacterProvider } from '../../domain/interfaces/character-provider.interface';
import { CharacterService } from './character.service';

jest.mock('fs/promises');

describe('CharacterService', () => {
  let service: CharacterService;
  let providerFactory: jest.Mocked<CharacterProviderFactory>;
  let storageService: jest.Mocked<StorageService>;
  let mediaAssetsService: jest.Mocked<MediaAssetsService>;
  let creditsService: jest.Mocked<CreditsService>;
  let provider: jest.Mocked<ICharacterProvider>;

  const actor = { userId: 'user-1', organizationId: 'org-1', workspaceId: 'workspace-1' };

  const completedResult: CharacterGenerationResult = {
    provider: 'did',
    jobId: 'job-1',
    status: 'completed',
    videoUrl: 'https://vendor.example.com/job-1.mp4',
  };

  beforeEach(() => {
    provider = { name: 'did', submitJob: jest.fn(), getJobStatus: jest.fn() };
    providerFactory = { getProvider: jest.fn().mockReturnValue(provider), listProviders: jest.fn() } as unknown as jest.Mocked<CharacterProviderFactory>;
    storageService = {
      uploadFile: jest.fn().mockResolvedValue({ key: 'character/job-1.mp4', url: 'https://cdn.example.com/character/job-1.mp4' }),
    } as unknown as jest.Mocked<StorageService>;
    mediaAssetsService = {
      findCached: jest.fn().mockResolvedValue(null),
      saveGenerated: jest.fn().mockResolvedValue({ id: 'asset-1' }),
    } as unknown as jest.Mocked<MediaAssetsService>;
    creditsService = { reserve: jest.fn(), refund: jest.fn() } as unknown as jest.Mocked<CreditsService>;

    service = new CharacterService(providerFactory, storageService, mediaAssetsService, creditsService);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;
    (readFile as jest.Mock).mockResolvedValue(Buffer.from('local-file-bytes'));
  });

  describe('getJobStatus', () => {
    it('does not attempt to persist a job that is still in progress', async () => {
      provider.getJobStatus.mockResolvedValue({ ...completedResult, status: 'processing', videoUrl: undefined });

      const result = await service.getJobStatus('did', 'job-1', actor);

      expect(result.status).toBe('processing');
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
    });

    it('re-hosts a newly-completed http(s) video and saves it to the gallery', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);

      const result = await service.getJobStatus('did', 'job-1', actor);

      expect(global.fetch).toHaveBeenCalledWith(completedResult.videoUrl);
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'video/mp4' }),
        'character',
      );
      expect(mediaAssetsService.saveGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
          type: MediaAssetType.VIDEO,
          provider: 'did',
          url: 'https://cdn.example.com/character/job-1.mp4',
        }),
        'user-1',
      );
      expect(result.videoUrl).toBe('https://cdn.example.com/character/job-1.mp4');
    });

    it('reads a local file path (SadTalker-style source) instead of fetching over http', async () => {
      provider.getJobStatus.mockResolvedValue({ ...completedResult, videoUrl: '/tmp/renders/job-1.mp4' });

      await service.getJobStatus('did', 'job-1', actor);

      expect(readFile).toHaveBeenCalledWith('/tmp/renders/job-1.mp4');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('serves the cached asset on a repeat poll instead of re-downloading (the pre-existing bug this fixes)', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);
      mediaAssetsService.findCached.mockResolvedValue({ url: 'https://cdn.example.com/already-saved.mp4' } as never);

      const result = await service.getJobStatus('did', 'job-1', actor);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(result.videoUrl).toBe('https://cdn.example.com/already-saved.mp4');
    });

    it('still re-hosts for CORS purposes without a tenant, but skips saving to a gallery', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);

      const result = await service.getJobStatus('did', 'job-1', { userId: 'user-1', organizationId: null, workspaceId: null });

      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(mediaAssetsService.saveGenerated).not.toHaveBeenCalled();
      expect(result.videoUrl).toBe('https://cdn.example.com/character/job-1.mp4');
    });

    it('falls back to the vendor URL instead of throwing when persistence fails', async () => {
      provider.getJobStatus.mockResolvedValue(completedResult);
      storageService.uploadFile.mockRejectedValue(new Error('storage down'));

      const result = await service.getJobStatus('did', 'job-1', actor);

      expect(result).toEqual(completedResult);
    });
  });
});
