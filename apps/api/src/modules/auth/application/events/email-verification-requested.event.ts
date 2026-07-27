import { DomainEvent } from '@events/domain-event.base';

export class EmailVerificationRequestedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
  ) {
    super();
  }
}
