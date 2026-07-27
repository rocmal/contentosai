import { DomainEvent } from '@events/domain-event.base';

export class AutomationWorkflowCreatedEvent extends DomainEvent {
  constructor(
    public readonly automationWorkflowId: string,
    public readonly workspaceId: string,
  ) {
    super();
  }
}
