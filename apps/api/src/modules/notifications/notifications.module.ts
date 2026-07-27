import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationModel } from './infrastructure/persistence/notification.model';
import { NotificationsRepository } from './infrastructure/persistence/notifications.repository';
import { NOTIFICATIONS_REPOSITORY } from './domain/repositories/notification-repository.interface';
import { NotificationsService } from './application/services/notifications.service';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [SequelizeModule.forFeature([NotificationModel])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATIONS_REPOSITORY, useClass: NotificationsRepository },
  ],
  exports: [NotificationsService, NOTIFICATIONS_REPOSITORY],
})
export class NotificationsModule {}
