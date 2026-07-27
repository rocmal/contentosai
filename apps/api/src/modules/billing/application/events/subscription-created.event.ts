import { DomainEvent } from '@events/domain-event.base';

export class SubscriptionCreatedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly organizationId: string,
  ) {
    super();
  }
}
