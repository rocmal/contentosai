import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  VideoProject,
  VideoProjectSource,
  VideoProjectStatus,
} from '../../domain/entities/video-project.entity';
import { IVideoProjectsRepository } from '../../domain/repositories/video-project-repository.interface';
import { CreateVideoProjectDto } from '../dto/create-video-project.dto';
import { VideoProjectsService } from './video-projects.service';

describe('VideoProjectsService', () => {
  let service: VideoProjectsService;
  let repository: jest.Mocked<IVideoProjectsRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const ownedProject: VideoProject = {
    id: 'project-1',
    organizationId: 'org-1',
    workspaceId: 'workspace-1',
    title: 'Fall menu launch reel',
    source: VideoProjectSource.SCENES,
    status: VideoProjectStatus.DRAFT,
    scenes: [],
    aspectRatio: '16:9',
    transition: 'none',
    narrationText: null,
    narrationVoiceId: null,
    narrationGender: null,
    narrationLanguage: null,
    finalAssetId: null,
    createdBy: 'user-1',
    updatedBy: null,
    createdAt: new Date('2026-08-20T00:00:00Z'),
    updatedAt: new Date('2026-08-20T00:00:00Z'),
    deletedAt: null,
    version: 0,
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IVideoProjectsRepository>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new VideoProjectsService(repository, eventEmitter);
  });

  describe('create', () => {
    it('fills in defaults (title, source, status, scenes) when the dto omits them', async () => {
      repository.create.mockResolvedValue(ownedProject);
      const dto: CreateVideoProjectDto = { organizationId: 'org-1', workspaceId: 'workspace-1' };

      await service.create(dto, 'user-1');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled video',
          source: VideoProjectSource.SCENES,
          status: VideoProjectStatus.DRAFT,
          scenes: [],
        }),
        'user-1',
      );
    });

    it('emits video-projects.created', async () => {
      repository.create.mockResolvedValue(ownedProject);

      await service.create({ organizationId: 'org-1', workspaceId: 'workspace-1' }, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'video-projects.created',
        expect.objectContaining({ videoProjectId: 'project-1', workspaceId: 'workspace-1' }),
      );
    });
  });

  describe('findMine', () => {
    it('sorts by updatedAt DESC, scoped to the workspace and owner', async () => {
      const page = { items: [ownedProject], meta: { totalItems: 1, itemCount: 1, itemsPerPage: 20, totalPages: 1, currentPage: 1 } };
      repository.findAll.mockResolvedValue(page);

      const result = await service.findMine('workspace-1', 'user-1');

      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'updatedAt',
          sortOrder: 'DESC',
          filters: { workspaceId: 'workspace-1', createdBy: 'user-1' },
        }),
      );
      expect(result).toBe(page);
    });
  });

  describe('findOwned', () => {
    it('returns the project when it belongs to the requesting user', async () => {
      repository.findById.mockResolvedValue(ownedProject);

      const result = await service.findOwned('project-1', 'user-1');

      expect(result).toBe(ownedProject);
    });

    it('throws NotFoundException when the project does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOwned('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the project belongs to a different user', async () => {
      repository.findById.mockResolvedValue(ownedProject);

      await expect(service.findOwned('project-1', 'someone-else')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('rejects updating another user\'s project, without touching the repository', async () => {
      repository.findById.mockResolvedValue(ownedProject);

      await expect(service.update('project-1', { title: 'Edited' }, 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('patches the project when the caller owns it', async () => {
      repository.findById.mockResolvedValue(ownedProject);
      repository.update.mockResolvedValue({ ...ownedProject, title: 'Edited' });

      await service.update('project-1', { title: 'Edited' }, 'user-1');

      expect(repository.update).toHaveBeenCalledWith('project-1', { title: 'Edited' }, 'user-1');
    });
  });

  describe('finish', () => {
    it('rejects finishing another user\'s project, without touching the repository', async () => {
      repository.findById.mockResolvedValue(ownedProject);

      await expect(service.finish('project-1', 'asset-1', 'someone-else')).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('marks the project ready and attaches the final asset when the caller owns it', async () => {
      repository.findById.mockResolvedValue(ownedProject);
      repository.update.mockResolvedValue({
        ...ownedProject,
        status: VideoProjectStatus.READY,
        finalAssetId: 'asset-1',
      });

      await service.finish('project-1', 'asset-1', 'user-1');

      expect(repository.update).toHaveBeenCalledWith(
        'project-1',
        { status: VideoProjectStatus.READY, finalAssetId: 'asset-1' },
        'user-1',
      );
    });
  });

  describe('remove', () => {
    it('rejects deleting another user\'s project, without touching the repository', async () => {
      repository.findById.mockResolvedValue(ownedProject);

      await expect(service.remove('project-1', 'someone-else')).rejects.toThrow(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes when the caller owns the project', async () => {
      repository.findById.mockResolvedValue(ownedProject);

      await service.remove('project-1', 'user-1');

      expect(repository.delete).toHaveBeenCalledWith('project-1', 'user-1');
    });
  });
});
