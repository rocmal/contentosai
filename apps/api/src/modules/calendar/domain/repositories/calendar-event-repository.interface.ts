import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { CalendarEvent } from '../entities/calendar-event.entity';

export interface CreateCalendarEventData {
  organizationId: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  contentId?: string | null;
  campaignId?: string | null;
}

export type UpdateCalendarEventData = Partial<
  Omit<CreateCalendarEventData, 'organizationId' | 'workspaceId'>
>;

export const CALENDAR_EVENTS_REPOSITORY = Symbol('CALENDAR_EVENTS_REPOSITORY');

export type ICalendarEventsRepository = IBaseRepository<
  CalendarEvent,
  CreateCalendarEventData,
  UpdateCalendarEventData
>;
