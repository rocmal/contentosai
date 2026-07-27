import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * Central registration for the in-process domain event bus. Modules publish
 * events via EventEmitter2.emit(...) and any module can subscribe with
 * @OnEvent(...) without a direct dependency on the publisher - this is what
 * keeps e.g. the users module from knowing that notifications/analytics react
 * to user.created.
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  exports: [EventEmitterModule],
})
export class DomainEventsModule {}
