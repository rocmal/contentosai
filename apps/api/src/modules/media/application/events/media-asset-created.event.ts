import { DomainEvent } from '@events/domain-event.base';

export class MediaAssetCreatedEvent extends DomainEvent {
  constructor(
    public readonly mediaAssetId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
