import { DomainEvent } from '@events/domain-event.base';

/** A platform admin opened an account for someone: email them the link to choose their password. */
export class AccountCreatedForCustomerEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly token: string,
  ) {
    super();
  }
}
