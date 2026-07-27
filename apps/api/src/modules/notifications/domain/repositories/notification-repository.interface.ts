import {
  FindAllOptions,
  IBaseRepository,
  PaginatedResult,
} from '@shared/interfaces/base-repository.interface';
import { Notification, NotificationType } from '../entities/notification.entity';

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: Record<string, unknown> | null;
}

export type UpdateNotificationData = Partial<
  Pick<CreateNotificationData, 'title' | 'message' | 'type' | 'metadata'>
> & {
  readAt?: Date | null;
};

export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');

export interface INotificationsRepository extends IBaseRepository<
  Notification,
  CreateNotificationData,
  UpdateNotificationData
> {
  listByUser(userId: string, options?: FindAllOptions): Promise<PaginatedResult<Notification>>;
}
