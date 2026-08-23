import { DomainEvent } from '@events/domain-event.base';

export class VideoProjectCreatedEvent extends DomainEvent {
  constructor(
    public readonly videoProjectId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
