import { DomainEvent } from '@events/domain-event.base';

export class CalendarEventCreatedEvent extends DomainEvent {
  constructor(
    public readonly calendarEventId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
