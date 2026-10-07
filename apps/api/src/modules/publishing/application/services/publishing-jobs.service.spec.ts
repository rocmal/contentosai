import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublishingJob, PublishingJobStatus } from '../../domain/entities/publishing-job.entity';
import { IPublishingJobsRepository } from '../../domain/repositories/publishing-job-repository.interface';
import { PublishingActor, PublishingJobsService } from './publishing-jobs.service';

describe('PublishingJobsService', () => {
  let repository: jest.Mocked<IPublishingJobsRepository>;
  let service: PublishingJobsService;

  const me: PublishingActor = { id: 'user-1', workspaceId: 'ws-1', roles: ['member'] };
  const mine = { id: 'j1', workspaceId: 'ws-1', createdBy: 'user-1' } as PublishingJob;
  const teammates = { id: 'j2', workspaceId: 'ws-1', createdBy: 'user-2' } as PublishingJob;
  const elsewhere = { id: 'j3', workspaceId: 'ws-9', createdBy: 'user-1' } as PublishingJob;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      findById: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(mine),
      delete: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IPublishingJobsRepository>;
    service = new PublishingJobsService(repository, {
      emit: jest.fn(),
    } as unknown as EventEmitter2);
  });

  describe('listForWorkspace', () => {
    it("lists only the caller's workspace, never everyone's", async () => {
      await service.listForWorkspace(me, { limit: 50 });

      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, filters: { workspaceId: 'ws-1' } }),
      );
    });

    it('returns nothing when the user has no workspace', async () => {
      const result = await service.listForWorkspace({ ...me, workspaceId: null });

      expect(result.items).toEqual([]);
      expect(repository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('summarize', () => {
    it('counts each status inside the workspace', async () => {
      repository.count.mockImplementation(async (filters) => {
        const status = (filters as { status: PublishingJobStatus }).status;
        return { scheduled: 3, published: 120, failed: 1 }[status];
      });

      const summary = await service.summarize(me);

      expect(summary).toEqual({ scheduled: 3, published: 120, failed: 1 });
      expect(repository.count).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        status: PublishingJobStatus.PUBLISHED,
      });
    });

    it('is all zeros, with no lookups, for a user without a workspace', async () => {
      expect(await service.summarize({ ...me, workspaceId: null })).toEqual({
        scheduled: 0,
        published: 0,
        failed: 0,
      });
      expect(repository.count).not.toHaveBeenCalled();
    });
  });

  describe('who can change a post', () => {
    it('hides a post from another workspace on a direct lookup', async () => {
      repository.findById.mockResolvedValue(elsewhere);
      await expect(service.findForActor('j3', me)).rejects.toThrow(NotFoundException);
    });

    it('lets the creator delete their own post', async () => {
      repository.findById.mockResolvedValue(mine);
      await service.remove('j1', me);
      expect(repository.delete).toHaveBeenCalledWith('j1', 'user-1');
    });

    it("will not let a member delete a teammate's post", async () => {
      repository.findById.mockResolvedValue(teammates);
      await expect(service.remove('j2', me)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("lets a workspace admin delete a teammate's post", async () => {
      repository.findById.mockResolvedValue(teammates);
      await service.remove('j2', { ...me, roles: ['admin'] });
      expect(repository.delete).toHaveBeenCalledWith('j2', 'user-1');
    });

    it('never lets even a super-admin touch another workspace', async () => {
      repository.findById.mockResolvedValue(elsewhere);
      await expect(service.update('j3', {}, { ...me, roles: ['super-admin'] })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  it('lets the background worker update a job with no signed-in user', async () => {
    repository.findById.mockResolvedValue(mine);

    await service.updateAsSystem('j1', { status: PublishingJobStatus.PUBLISHED });

    expect(repository.update).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ status: PublishingJobStatus.PUBLISHED }),
      undefined,
    );
  });
});
