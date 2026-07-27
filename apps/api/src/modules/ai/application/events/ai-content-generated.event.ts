import { DomainEvent } from '@events/domain-event.base';

export class AIContentGeneratedEvent extends DomainEvent {
  constructor(
    public readonly provider: string,
    public readonly model: string,
    public readonly userId?: string,
  ) {
    super();
  }
}
