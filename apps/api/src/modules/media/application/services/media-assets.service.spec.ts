import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IMediaAssetsRepository,
  CreateMediaAssetData,
} from '../../domain/repositories/media-asset-repository.interface';
import { MediaAsset, MediaAssetType } from '../../domain/entities/media-asset.entity';
import {
  GalleryLimitExceededException,
  MAX_GALLERY_MEDIA_PER_USER,
  MediaActor,
  MediaAssetsService,
} from './media-assets.service';

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
      searchLibrary: jest.fn(),
      findCreatorNames: jest.fn().mockResolvedValue(new Map()),
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
      expect(repository.count).toHaveBeenCalledWith({
        createdBy: 'user-1',
        type: MediaAssetType.IMAGE,
      });
      expect(repository.count).toHaveBeenCalledWith({
        createdBy: 'user-1',
        type: MediaAssetType.VIDEO,
      });
      expect(repository.count).toHaveBeenCalledWith({
        createdBy: 'user-1',
        type: MediaAssetType.CHARACTER,
      });
    });
  });

  describe('saveGenerated', () => {
    // countGalleryMedia sums three separate count() calls (images, videos,
    // character clips - see the Promise.all call order asserted in the
    // countGalleryMedia tests above), so each case here sets all three via
    // mockResolvedValueOnce rather than a single persistent mockResolvedValue
    // - otherwise every call returns the same number and gets miscounted.
    it('creates the asset when the user is under the cap', async () => {
      repository.count
        .mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER - 1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.saveGenerated(baseData, 'user-1');

      expect(repository.create).toHaveBeenCalledWith(baseData, 'user-1');
      expect(result).toBe(createdAsset);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'media.created',
        expect.objectContaining({ mediaAssetId: 'asset-1' }),
      );
    });

    it('rejects a new image once the user is exactly at the cap', async () => {
      repository.count
        .mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await expect(service.saveGenerated(baseData, 'user-1')).rejects.toThrow(
        GalleryLimitExceededException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a new video once the user is at the cap too', async () => {
      repository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER)
        .mockResolvedValueOnce(0);

      await expect(
        service.saveGenerated({ ...baseData, type: MediaAssetType.VIDEO }, 'user-1'),
      ).rejects.toThrow(GalleryLimitExceededException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a new character clip once the user is at the cap too - it shares the same quota as image/video', async () => {
      repository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(MAX_GALLERY_MEDIA_PER_USER);

      await expect(
        service.saveGenerated(
          { ...baseData, type: MediaAssetType.CHARACTER, mimeType: 'video/mp4' },
          'user-1',
        ),
      ).rejects.toThrow(GalleryLimitExceededException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not enforce the cap for audio - the quota only ever applies to image/video/character', async () => {
      await service.saveGenerated(
        { ...baseData, type: MediaAssetType.AUDIO, mimeType: 'audio/mpeg' },
        'user-1',
      );

      expect(repository.count).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });

    it('does not enforce the cap for documents - the quota only ever applies to image/video/character', async () => {
      await service.saveGenerated(
        { ...baseData, type: MediaAssetType.DOCUMENT, mimeType: 'application/pdf' },
        'user-1',
      );

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

  describe('gallery manager', () => {
    const me: MediaActor = { id: 'user-1', workspaceId: 'workspace-1', roles: ['member'] };
    const mine = {
      id: 'a1',
      workspaceId: 'workspace-1',
      createdBy: 'user-1',
      fileName: 'image-123.png',
    } as MediaAsset;
    const teammates = {
      id: 'a2',
      workspaceId: 'workspace-1',
      createdBy: 'user-2',
      fileName: 'reel.mp4',
    } as MediaAsset;
    const otherWorkspace = {
      id: 'a3',
      workspaceId: 'workspace-9',
      createdBy: 'user-1',
      fileName: 'x.png',
    } as MediaAsset;

    describe('listLibrary', () => {
      const page = (items: MediaAsset[]) => ({
        items,
        meta: {
          totalItems: items.length,
          itemCount: items.length,
          itemsPerPage: 24,
          totalPages: 1,
          currentPage: 1,
        },
      });

      it('shows only my items by default, tied to my workspace', async () => {
        repository.searchLibrary.mockResolvedValue(page([mine]));

        await service.listLibrary(me, {});

        expect(repository.searchLibrary).toHaveBeenCalledWith(
          expect.objectContaining({ workspaceId: 'workspace-1', createdBy: 'user-1' }),
        );
      });

      it('shows the whole workspace for the team gallery, with who made each item', async () => {
        repository.searchLibrary.mockResolvedValue(page([mine, teammates]));
        repository.findCreatorNames.mockResolvedValue(new Map([['user-2', 'Rajni Mehra']]));

        const result = await service.listLibrary(me, { scope: 'team' });

        const query = repository.searchLibrary.mock.calls[0][0];
        expect(query.createdBy).toBeUndefined();
        expect(result.items.map((i) => [i.createdByName, i.canManage])).toEqual([
          [null, true],
          ['Rajni Mehra', false],
        ]);
      });

      it('returns nothing when the user has no workspace, instead of listing everyone', async () => {
        const result = await service.listLibrary({ ...me, workspaceId: null }, { scope: 'team' });

        expect(result.items).toEqual([]);
        expect(repository.searchLibrary).not.toHaveBeenCalled();
      });
    });

    describe('rename', () => {
      it('renames my item and keeps the file extension when the new name has none', async () => {
        repository.findById.mockResolvedValue(mine);
        repository.update.mockResolvedValue(mine);

        await service.rename('a1', '  Diwali   greeting ', me);

        expect(repository.update).toHaveBeenCalledWith(
          'a1',
          { fileName: 'Diwali greeting.png' },
          'user-1',
        );
      });

      it('strips path characters from the new name', async () => {
        repository.findById.mockResolvedValue(mine);
        repository.update.mockResolvedValue(mine);

        await service.rename('a1', '../../etc/passwd.png', me);

        expect(repository.update.mock.calls[0][1]).toEqual({ fileName: '.. .. etc passwd.png' });
      });

      it('rejects an empty name', async () => {
        repository.findById.mockResolvedValue(mine);
        await expect(service.rename('a1', '  /  ', me)).rejects.toThrow('Give it a name.');
      });

      it("will not rename a teammate's item, and answers as if it does not exist", async () => {
        repository.findById.mockResolvedValue(teammates);
        await expect(service.rename('a2', 'mine now', me)).rejects.toThrow(NotFoundException);
        expect(repository.update).not.toHaveBeenCalled();
      });

      it("lets a workspace admin rename a teammate's item", async () => {
        repository.findById.mockResolvedValue(teammates);
        repository.update.mockResolvedValue(teammates);

        await service.rename('a2', 'Team reel', { ...me, roles: ['admin'] });

        expect(repository.update).toHaveBeenCalledWith(
          'a2',
          { fileName: 'Team reel.mp4' },
          'user-1',
        );
      });
    });

    describe('remove and read', () => {
      it('deletes my own item', async () => {
        repository.findById.mockResolvedValue(mine);
        await service.remove('a1', me);
        expect(repository.delete).toHaveBeenCalledWith('a1', 'user-1');
      });

      it('never touches an item in another workspace, even for an admin', async () => {
        repository.findById.mockResolvedValue(otherWorkspace);
        await expect(service.remove('a3', { ...me, roles: ['super-admin'] })).rejects.toThrow(
          NotFoundException,
        );
        expect(repository.delete).not.toHaveBeenCalled();
      });

      it("hides another workspace's item from a direct lookup", async () => {
        repository.findById.mockResolvedValue(otherWorkspace);
        await expect(service.findForActor('a3', me)).rejects.toThrow(NotFoundException);
      });

      it('only lets the name and prompt change through update', async () => {
        repository.findById.mockResolvedValue(mine);
        repository.update.mockResolvedValue(mine);

        await service.update(
          'a1',
          { fileName: 'new.png', url: 'https://evil.example/x.png' } as never,
          me,
        );

        expect(repository.update).toHaveBeenCalledWith(
          'a1',
          { fileName: 'new.png', prompt: undefined },
          'user-1',
        );
      });
    });
  });
});
