import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CalendarEventModel } from './infrastructure/persistence/calendar-event.model';
import { CalendarEventsRepository } from './infrastructure/persistence/calendar-events.repository';
import { CALENDAR_EVENTS_REPOSITORY } from './domain/repositories/calendar-event-repository.interface';
import { CalendarEventsService } from './application/services/calendar-events.service';
import { CalendarEventsController } from './presentation/calendar-events.controller';

@Module({
  imports: [SequelizeModule.forFeature([CalendarEventModel])],
  controllers: [CalendarEventsController],
  providers: [
    CalendarEventsService,
    { provide: CALENDAR_EVENTS_REPOSITORY, useClass: CalendarEventsRepository },
  ],
  exports: [CalendarEventsService, CALENDAR_EVENTS_REPOSITORY],
})
export class CalendarModule {}
