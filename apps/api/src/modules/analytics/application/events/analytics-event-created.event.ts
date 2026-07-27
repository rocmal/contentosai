import { DomainEvent } from '@events/domain-event.base';

export class AnalyticsEventCreatedEvent extends DomainEvent {
  constructor(
    public readonly analyticsEventId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
