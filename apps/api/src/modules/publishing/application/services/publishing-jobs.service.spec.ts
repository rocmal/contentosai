import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublishingJob, PublishingJobStatus } from '../../domain/entities/publishing-job.entity';
import { IPublishingJobsRepository } from '../../domain/repositories/publishing-job-repository.interface';
import { PublishingActor, PublishingJobsService } from './publishing-jobs.service';

describe('PublishingJobsService', () => {
  let repository: jest.Mocked<IPublishingJobsRepository>;
  let service: PublishingJobsService;
  let contentService: { findById: jest.Mock; update: jest.Mock };

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
    contentService = { findById: jest.fn(), update: jest.fn() };
    service = new PublishingJobsService(
      repository,
      { emit: jest.fn() } as unknown as EventEmitter2,
      contentService as never,
    );
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

  describe('editScheduledPost', () => {
    const scheduled = {
      id: 'j1',
      workspaceId: 'ws-1',
      createdBy: 'user-1',
      contentId: 'c1',
      status: PublishingJobStatus.SCHEDULED,
    } as PublishingJob;
    const content = { id: 'c1', workspaceId: 'ws-1', metadata: { videoUrl: 'v.mp4', caption: 'old' } };

    beforeEach(() => {
      repository.findById.mockResolvedValue(scheduled);
      repository.update.mockResolvedValue(scheduled);
      contentService.findById.mockResolvedValue(content);
    });

    it('changes the title and the text, keeping the video in the metadata', async () => {
      await service.editScheduledPost('j1', { title: ' New title ', caption: 'New text #lic' }, me);

      expect(contentService.update).toHaveBeenCalledWith(
        'c1',
        {
          title: 'New title',
          body: 'New text #lic',
          metadata: { videoUrl: 'v.mp4', caption: 'New text #lic' },
        },
        'user-1',
      );
    });

    it('moves the time and queues the post again', async () => {
      const when = new Date(Date.now() + 3_600_000).toISOString();

      await service.editScheduledPost('j1', { scheduledAt: when }, me);

      expect(repository.update).toHaveBeenCalledWith(
        'j1',
        { scheduledAt: new Date(when) },
        'user-1',
      );
    });

    it('refuses a time in the past, an empty title, and a post that already went out', async () => {
      await expect(
        service.editScheduledPost('j1', { scheduledAt: new Date(Date.now() - 1000).toISOString() }, me),
      ).rejects.toThrow('at least a minute');
      await expect(service.editScheduledPost('j1', { title: '  ' }, me)).rejects.toThrow('title');

      repository.findById.mockResolvedValue({ ...scheduled, status: PublishingJobStatus.PUBLISHED });
      await expect(service.editScheduledPost('j1', { caption: 'x' }, me)).rejects.toThrow(
        'still scheduled',
      );
    });

    it("does not touch another workspace's content", async () => {
      contentService.findById.mockResolvedValue({ ...content, workspaceId: 'ws-9' });

      await expect(service.editScheduledPost('j1', { caption: 'x' }, me)).rejects.toThrow(
        NotFoundException,
      );
      expect(contentService.update).not.toHaveBeenCalled();
    });
  });
});
