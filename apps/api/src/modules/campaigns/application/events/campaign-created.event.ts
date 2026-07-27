import { DomainEvent } from '@events/domain-event.base';

export class CampaignCreatedEvent extends DomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
