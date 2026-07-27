import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { CalendarEvent } from '../../domain/entities/calendar-event.entity';
import {
  CALENDAR_EVENTS_REPOSITORY,
  ICalendarEventsRepository,
} from '../../domain/repositories/calendar-event-repository.interface';
import { CreateCalendarEventDto } from '../dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from '../dto/update-calendar-event.dto';
import { CalendarEventCreatedEvent } from '../events/calendar-event-created.event';

@Injectable()
export class CalendarEventsService {
  constructor(
    @Inject(CALENDAR_EVENTS_REPOSITORY)
    private readonly calendarEventsRepository: ICalendarEventsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateCalendarEventDto, actorId?: string): Promise<CalendarEvent> {
    const calendarEvent = await this.calendarEventsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        title: dto.title,
        description: dto.description ?? null,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        contentId: dto.contentId ?? null,
        campaignId: dto.campaignId ?? null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'calendar.created',
      new CalendarEventCreatedEvent(calendarEvent.id, calendarEvent.workspaceId),
    );

    return calendarEvent;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<CalendarEvent>> {
    return this.calendarEventsRepository.findAll(options);
  }

  async findById(id: string): Promise<CalendarEvent> {
    const calendarEvent = await this.calendarEventsRepository.findById(id);
    if (!calendarEvent) {
      throw new NotFoundException(`CalendarEvent with id "${id}" not found`);
    }
    return calendarEvent;
  }

  async update(id: string, dto: UpdateCalendarEventDto, actorId?: string): Promise<CalendarEvent> {
    await this.findById(id);
    return this.calendarEventsRepository.update(
      id,
      {
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        contentId: dto.contentId,
        campaignId: dto.campaignId,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.calendarEventsRepository.delete(id, actorId);
  }
}
