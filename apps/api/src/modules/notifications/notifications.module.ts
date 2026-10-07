import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationModel } from './infrastructure/persistence/notification.model';
import { NotificationsRepository } from './infrastructure/persistence/notifications.repository';
import { NOTIFICATIONS_REPOSITORY } from './domain/repositories/notification-repository.interface';
import { PushTokenModel } from './infrastructure/persistence/push-token.model';
import { PushTokensRepository } from './infrastructure/persistence/push-tokens.repository';
import { PUSH_TOKENS_REPOSITORY } from './domain/repositories/push-token-repository.interface';
import { PushService } from './application/services/push.service';
import { NotificationsService } from './application/services/notifications.service';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [SequelizeModule.forFeature([NotificationModel, PushTokenModel])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushService,
    { provide: PUSH_TOKENS_REPOSITORY, useClass: PushTokensRepository },
    { provide: NOTIFICATIONS_REPOSITORY, useClass: NotificationsRepository },
  ],
  exports: [NotificationsService, PushService, NOTIFICATIONS_REPOSITORY],
})
export class NotificationsModule {}
