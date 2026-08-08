import { DomainEvent } from '@events/domain-event.base';
import { PublishingJobStatus } from '../../domain/entities/publishing-job.entity';

export class PublishingJobCreatedEvent extends DomainEvent {
  constructor(
    public readonly publishingJobId: string,
    public readonly workspaceId: string,
    public readonly status: PublishingJobStatus,
    public readonly scheduledAt: Date | null,
  ) {
    super();
  }
}
