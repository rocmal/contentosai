import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VideoCreditsService } from './credits.service';

interface TurnSettledEvent {
  readonly turnId: string;
  readonly sessionId: string;
  readonly creditReservationId: string | null;
  readonly actorId: string;
  readonly reason?: string;
}

/**
 * Settles video reservations off the domain events the video module already
 * emits, so the video pipeline never imports the credit repositories and the
 * two modules stay independently testable.
 */
@Injectable()
export class VideoCreditListener {
  private readonly logger = new Logger(VideoCreditListener.name);

  constructor(private readonly credits: VideoCreditsService) {}

  @OnEvent('video.turn-completed')
  async onCompleted(event: TurnSettledEvent): Promise<void> {
    if (!event.creditReservationId) {
      return;
    }
    await this.settle(() =>
      this.credits.commit(event.creditReservationId as string, event.actorId),
    );
  }

  @OnEvent('video.turn-failed')
  async onFailed(event: TurnSettledEvent): Promise<void> {
    if (!event.creditReservationId) {
      return;
    }
    await this.settle(() =>
      this.credits.refund(
        event.creditReservationId as string,
        event.reason ?? 'generation failed',
        event.actorId,
      ),
    );
  }

  /**
   * Settlement failures are logged rather than rethrown: an exception here
   * would bubble into the generation pipeline and fail a turn that actually
   * succeeded. Stranded holds are recovered by the reconciliation sweep.
   */
  private async settle(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Credit settlement failed: ${message}`);
    }
  }
}
