import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AnalyticsEventModel } from './infrastructure/persistence/analytics-event.model';
import { AnalyticsEventsRepository } from './infrastructure/persistence/analytics-events.repository';
import { ANALYTICS_EVENTS_REPOSITORY } from './domain/repositories/analytics-event-repository.interface';
import { AnalyticsEventsService } from './application/services/analytics-events.service';
import { AnalyticsEventsController } from './presentation/analytics-events.controller';

@Module({
  imports: [SequelizeModule.forFeature([AnalyticsEventModel])],
  controllers: [AnalyticsEventsController],
  providers: [
    AnalyticsEventsService,
    { provide: ANALYTICS_EVENTS_REPOSITORY, useClass: AnalyticsEventsRepository },
  ],
  exports: [AnalyticsEventsService, ANALYTICS_EVENTS_REPOSITORY],
})
export class AnalyticsModule {}
