import { DomainEvent } from '@events/domain-event.base';

export class SettingCreatedEvent extends DomainEvent {
  constructor(
    public readonly settingId: string,
    public readonly organizationId: string,
  ) {
    super();
  }
}
