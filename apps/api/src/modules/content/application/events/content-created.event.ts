import { DomainEvent } from '@events/domain-event.base';

export class ContentCreatedEvent extends DomainEvent {
  constructor(
    public readonly contentId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
