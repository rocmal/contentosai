import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { INotificationsRepository } from '../../domain/repositories/notification-repository.interface';
import { Notification, NotificationType } from '../../domain/entities/notification.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<INotificationsRepository>;

  const ownedNotification: Notification = {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Post published',
    message: 'Your reel went live on Instagram.',
    type: NotificationType.SUCCESS,
    readAt: null,
    metadata: null,
  } as Notification;

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
      listByUser: jest.fn(),
    } as unknown as jest.Mocked<INotificationsRepository>;

    service = new NotificationsService(repository);
  });

  describe('findOwned', () => {
    it('returns the notification when it belongs to the requesting user', async () => {
      repository.findById.mockResolvedValue(ownedNotification);

      const result = await service.findOwned('notif-1', 'user-1');

      expect(result).toBe(ownedNotification);
    });

    it('throws NotFoundException when the notification does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOwned('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when the notification belongs to a different user", async () => {
      repository.findById.mockResolvedValue(ownedNotification);

      await expect(service.findOwned('notif-1', 'someone-else')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRead', () => {
    it("sets readAt when the caller owns the notification", async () => {
      repository.findById.mockResolvedValue(ownedNotification);
      repository.update.mockResolvedValue({ ...ownedNotification, readAt: new Date() });

      await service.markAsRead('notif-1', 'user-1');

      expect(repository.update).toHaveBeenCalledWith(
        'notif-1',
        { readAt: expect.any(Date) },
        'user-1',
      );
    });

    it("rejects marking another user's notification as read, without touching the repository", async () => {
      repository.findById.mockResolvedValue(ownedNotification);

      await expect(service.markAsRead('notif-1', 'someone-else')).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes when the caller owns the notification', async () => {
      repository.findById.mockResolvedValue(ownedNotification);

      await service.remove('notif-1', 'user-1');

      expect(repository.delete).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    it("rejects deleting another user's notification, without touching the repository", async () => {
      repository.findById.mockResolvedValue(ownedNotification);

      await expect(service.remove('notif-1', 'someone-else')).rejects.toThrow(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it("rejects updating another user's notification, without touching the repository", async () => {
      repository.findById.mockResolvedValue(ownedNotification);

      await expect(
        service.update('notif-1', { title: 'Edited' }, 'someone-else'),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it("delegates to the repository's already-scoped listByUser (no extra ownership check needed)", async () => {
      const page = { items: [ownedNotification], meta: { totalItems: 1, itemCount: 1, itemsPerPage: 20, totalPages: 1, currentPage: 1 } };
      repository.listByUser.mockResolvedValue(page);

      const result = await service.findByUser('user-1');

      expect(repository.listByUser).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toBe(page);
    });
  });
});
