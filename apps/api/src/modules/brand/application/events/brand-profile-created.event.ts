import { DomainEvent } from '@events/domain-event.base';

export class BrandProfileCreatedEvent extends DomainEvent {
  constructor(
    public readonly brandProfileId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
