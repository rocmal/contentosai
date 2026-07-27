import { ApiProperty } from '@nestjs/swagger';
import { Notification, NotificationType } from '../../domain/entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty({ nullable: true }) readAt: Date | null;
  @ApiProperty({ nullable: true, type: Object }) metadata: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(notification: Notification) {
    this.id = notification.id;
    this.userId = notification.userId;
    this.title = notification.title;
    this.message = notification.message;
    this.type = notification.type;
    this.readAt = notification.readAt;
    this.metadata = notification.metadata;
    this.createdAt = notification.createdAt;
    this.updatedAt = notification.updatedAt;
  }
}
