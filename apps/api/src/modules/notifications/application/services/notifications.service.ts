import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import {
  INotificationsRepository,
  NOTIFICATIONS_REPOSITORY,
} from '../../domain/repositories/notification-repository.interface';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

/**
 * No `notifications.created` event is emitted here - doing so would let a
 * listener react to a notification by creating another notification, looping
 * forever.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notificationsRepository: INotificationsRepository,
  ) {}

  async create(dto: CreateNotificationDto, actorId?: string): Promise<Notification> {
    return this.notificationsRepository.create(
      {
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        metadata: dto.metadata ?? null,
      },
      actorId,
    );
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Notification>> {
    return this.notificationsRepository.findAll(options);
  }

  async findByUser(
    userId: string,
    options?: FindAllOptions,
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationsRepository.listByUser(userId, options);
  }

  async findById(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }
    return notification;
  }

  /**
   * Same lookup as findById, but for the single-record read/write routes,
   * which are reached by id rather than through the already-user-scoped
   * findByUser list. Without this, `notifications.read`/`.update`/`.delete`
   * being granted at all (even just "read/update/delete your own") would let
   * one user act on another user's notification by id.
   */
  private async findOwnedById(id: string, actorId: string): Promise<Notification> {
    const notification = await this.findById(id);
    if (notification.userId !== actorId) {
      throw new ForbiddenException('You do not have access to this notification');
    }
    return notification;
  }

  async findOwned(id: string, actorId: string): Promise<Notification> {
    return this.findOwnedById(id, actorId);
  }

  async update(id: string, dto: UpdateNotificationDto, actorId: string): Promise<Notification> {
    await this.findOwnedById(id, actorId);
    return this.notificationsRepository.update(id, dto, actorId);
  }

  async markAsRead(id: string, actorId: string): Promise<Notification> {
    await this.findOwnedById(id, actorId);
    return this.notificationsRepository.update(id, { readAt: new Date() }, actorId);
  }

  async remove(id: string, actorId: string): Promise<void> {
    await this.findOwnedById(id, actorId);
    await this.notificationsRepository.delete(id, actorId);
  }
}
