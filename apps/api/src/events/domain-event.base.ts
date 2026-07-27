/** Common shape for every domain event emitted through EventEmitter2. */
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
}
