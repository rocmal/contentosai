import { DomainEvent } from '@events/domain-event.base';

export class VideoTemplateCreatedEvent extends DomainEvent {
  constructor(
    public readonly videoTemplateId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
