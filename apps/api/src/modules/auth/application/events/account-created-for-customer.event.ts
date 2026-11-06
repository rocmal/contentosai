import { DomainEvent } from '@events/domain-event.base';

/** A platform admin opened an account for someone: email them the link to choose their password, or - when the admin
 * set the password (`token` null) - that the account is ready (the password itself is never emailed). */
export class AccountCreatedForCustomerEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly token: string | null,
  ) {
    super();
  }
}
