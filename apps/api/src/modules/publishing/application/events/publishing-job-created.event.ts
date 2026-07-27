import { DomainEvent } from '@events/domain-event.base';

export class PublishingJobCreatedEvent extends DomainEvent {
  constructor(
    public readonly publishingJobId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
