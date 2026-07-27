import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SubscriptionModel } from './infrastructure/persistence/subscription.model';
import { SubscriptionsRepository } from './infrastructure/persistence/subscriptions.repository';
import { SUBSCRIPTIONS_REPOSITORY } from './domain/repositories/subscription-repository.interface';
import { SubscriptionsService } from './application/services/subscriptions.service';
import { SubscriptionsController } from './presentation/subscriptions.controller';

@Module({
  imports: [SequelizeModule.forFeature([SubscriptionModel])],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    { provide: SUBSCRIPTIONS_REPOSITORY, useClass: SubscriptionsRepository },
  ],
  exports: [SubscriptionsService, SUBSCRIPTIONS_REPOSITORY],
})
export class BillingModule {}
