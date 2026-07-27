import { DomainEvent } from '@events/domain-event.base';

export class OrganizationCreatedEvent extends DomainEvent {
  constructor(
    public readonly organizationId: string,
    public readonly ownerId: string,
  ) {
    super();
  }
}
