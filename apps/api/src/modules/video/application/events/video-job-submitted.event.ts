import { DomainEvent } from '@events/domain-event.base';

/**
 * Emitted once a video generation job has been accepted by the provider.
 * VideoEventsListener consumes this to enqueue the durable server-side
 * poller (VideoProcessor) - carrying the actor's tenant context along so
 * that poller can persist a completed clip to the gallery on its own,
 * without depending on the submitting client ever coming back to check.
 */
export class VideoJobSubmittedEvent extends DomainEvent {
  constructor(
    public readonly provider: string,
    public readonly jobId: string,
    public readonly userId?: string,
    public readonly organizationId?: string | null,
    public readonly workspaceId?: string | null,
    public readonly cacheKey?: string,
    /** What the clip was made from, so its gallery entry can show and reuse it. */
    public readonly prompt?: string,
    /** What the job cost, so the poller can give it back if the clip never arrives. 0 when nothing was charged. */
    public readonly creditsCharged = 0,
  ) {
    super();
  }
}
