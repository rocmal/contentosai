import { DomainEvent } from '@events/domain-event.base';

export class VoiceTemplateCreatedEvent extends DomainEvent {
  constructor(
    public readonly voiceTemplateId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
