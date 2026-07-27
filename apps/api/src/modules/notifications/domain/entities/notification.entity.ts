import { BaseEntity } from '@shared/domain/base.entity';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
}
