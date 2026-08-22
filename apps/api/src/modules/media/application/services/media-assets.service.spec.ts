import { EventEmitter2 } from '@nestjs/event-emitter';
import { IMediaAssetsRepository, CreateMediaAssetData } from '../../domain/repositories/media-asset-repository.interface';
import { MediaAsset, MediaAssetType } from '../../domain/entities/media-asset.entity';
import { GalleryLimitExceededException, MAX_GALLERY_MEDIA_PER_USER, MediaAssetsService } from './media-assets.service';

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;
  let repository: jest.Mocked<IMediaAssetsRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const baseData: CreateMediaAssetData = {
    organizationId: 'org-1',
    workspaceId: 'workspace-1',
    fileName: 'photo.jpg',
    storageKey: 'gallery/photo.jpg',
    url: 'https://cdn.example.com/gallery/photo.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    type: MediaAssetType.IMAGE,
  };

  const createdAsset = { id: 'asset-1', workspaceId: 'workspace-1' } as MediaAsset;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue(createdAsset),
      count: jest.fn().mockResolvedValue(0),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IMediaAssetsRepository>;

    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new MediaAssetsService(repository, eventEmitter);
  });

  describe('countGalleryMedia', () => {
    it('sums image, video, and character counts for the user', async () => {
      repository.count
        .mockResolvedValueOnce(3) // images
        .mockResolvedValueOnce(5) // videos
        .mockResolvedValueOnce(2); // character clips

      const count = await service.countGalleryMedia('user-1');

      expect(count).toBe(10);
      expect(repository.count).toHaveBeenCalledWith({ createdBy: 'user-1', type: MediaAssetType.IMAGE });
      expect(repository.count).toHaveBeenCalledWith({ createdBy: 'user-1', type: MediaAssetType.VIDEO });
      expect(repository.count).toHaveBeenCalledWith({ createdBy: 'user-1', type: MediaAssetType.CHARACTER });
    });
  });

  describe('saveGenerated', () => {
    // countGalleryMedia sums three separate count() calls (images, videos,
    // character clips - see the Promise.all call order asserted in the
    // countGalleryMedia tests above), so each case here sets all three via
    // mockResolvedValueOnce rather than a single persistent mockResolvedValue
    // - otherwise every call returns the same number and gets miscounted.
    it('creates the asset when the user is under the cap', async () => {
      repository.count.mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER - 1).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.saveGenerated(baseData, 'user-1');

      expect(repository.create).toHaveBeenCalledWith(baseData, 'user-1');
      expect(result).toBe(createdAsset);
      expect(eventEmitter.emit).toHaveBeenCalledWith('media.created', expect.objectContaining({ mediaAssetId: 'asset-1' }));
    });

    it('rejects a new image once the user is exactly at the cap', async () => {
      repository.count.mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      await expect(service.saveGenerated(baseData, 'user-1')).rejects.toThrow(GalleryLimitExceededException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a new video once the user is at the cap too', async () => {
      repository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER).mockResolvedValueOnce(0);

      await expect(
        service.saveGenerated({ ...baseData, type: MediaAssetType.VIDEO }, 'user-1'),
      ).rejects.toThrow(GalleryLimitExceededException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a new character clip once the user is at the cap too - it shares the same quota as image/video', async () => {
      repository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER);

      await expect(
        service.saveGenerated({ ...baseData, type: MediaAssetType.CHARACTER, mimeType: 'video/mp4' }, 'user-1'),
      ).rejects.toThrow(GalleryLimitExceededException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not enforce the cap for audio - the quota only ever applies to image/video/character', async () => {
      await service.saveGenerated({ ...baseData, type: MediaAssetType.AUDIO, mimeType: 'audio/mpeg' }, 'user-1');

      expect(repository.count).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });

    it('does not enforce the cap for documents - the quota only ever applies to image/video/character', async () => {
      await service.saveGenerated({ ...baseData, type: MediaAssetType.DOCUMENT, mimeType: 'application/pdf' }, 'user-1');

      expect(repository.count).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });

    it('skips the quota check entirely when no actorId is given', async () => {
      repository.count.mockResolvedValue(MAX_GALLERY_MEDIA_PER_USER + 10);

      await service.saveGenerated(baseData);

      expect(repository.count).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(baseData, undefined);
    });
  });
});
