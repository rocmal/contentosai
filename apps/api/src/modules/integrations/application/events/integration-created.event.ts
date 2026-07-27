import { DomainEvent } from '@events/domain-event.base';

export class IntegrationCreatedEvent extends DomainEvent {
  constructor(
    public readonly integrationId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
