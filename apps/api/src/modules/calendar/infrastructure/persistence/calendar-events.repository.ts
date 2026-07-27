import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { CalendarEvent } from '../../domain/entities/calendar-event.entity';
import {
  CreateCalendarEventData,
  ICalendarEventsRepository,
  UpdateCalendarEventData,
} from '../../domain/repositories/calendar-event-repository.interface';
import { CalendarEventModel } from './calendar-event.model';

@Injectable()
export class CalendarEventsRepository
  extends BaseRepository<
    CalendarEventModel,
    CalendarEvent,
    CreateCalendarEventData,
    UpdateCalendarEventData
  >
  implements ICalendarEventsRepository
{
  constructor(@InjectModel(CalendarEventModel) model: typeof CalendarEventModel) {
    super(model);
  }

  protected toEntity(instance: CalendarEventModel): CalendarEvent {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      title: plain.title,
      description: plain.description,
      startAt: plain.startAt,
      endAt: plain.endAt,
      contentId: plain.contentId,
      campaignId: plain.campaignId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
