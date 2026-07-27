import { DomainEvent } from '@events/domain-event.base';

export class PasswordResetRequestedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
  ) {
    super();
  }
}
