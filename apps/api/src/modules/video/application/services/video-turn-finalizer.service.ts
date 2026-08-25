import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { VideoEditTurn } from '../../domain/entities/video-edit-turn.entity';
import { completeTurn, failTurn } from '../../domain/entities/video-edit-turn.rules';
import {
  IVideoEditTurnsRepository,
  VIDEO_EDIT_TURNS_REPOSITORY,
} from '../../domain/repositories/video-edit-turn-repository.interface';
import {
  GENERATED_VIDEO_STORE,
  IGeneratedVideoStore,
} from '../../domain/interfaces/generated-video-store.port';
import { VideoPayload, VideoTurnStatus } from '../../domain/interfaces/conversational-video.port';

/**
 * Terminal-state handling for a turn, shared by the synchronous path, the
 * background reconciliation worker, and (once enabled) webhook delivery.
 *
 * Every entry point is idempotent because more than one of them can observe
 * the same completion. The domain rules return null for a no-op transition,
 * which is what makes double delivery harmless here.
 */
@Injectable()
export class VideoTurnFinalizerService {
  private readonly logger = new Logger(VideoTurnFinalizerService.name);

  constructor(
    @Inject(VIDEO_EDIT_TURNS_REPOSITORY)
    private readonly turnsRepository: IVideoEditTurnsRepository,
    @Inject(GENERATED_VIDEO_STORE)
    private readonly videoStore: IGeneratedVideoStore,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async finalizeCompleted(
    turn: VideoEditTurn,
    payload: VideoPayload,
    actorId: string,
  ): Promise<VideoEditTurn> {
    if (turn.status === VideoTurnStatus.COMPLETED) {
      return turn;
    }

    const stored = await this.videoStore.persist(payload, {
      organizationId: turn.organizationId,
      workspaceId: turn.workspaceId,
      sessionId: turn.sessionId,
      turnId: turn.id,
    });

    const asset = await this.mediaAssetsService.create(
      {
        organizationId: turn.organizationId,
        workspaceId: turn.workspaceId,
        fileName: stored.fileName,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        type: MediaAssetType.VIDEO,
      },
      actorId,
    );

    const patch = completeTurn(turn, asset.id);
    if (patch === null) {
      return turn;
    }

    const updated = await this.turnsRepository.update(turn.id, patch, actorId);

    // The credits module listens for this and commits the hold. Emitting the
    // reservation id here is what keeps the video pipeline free of any
    // dependency on the credit repositories.
    this.eventEmitter.emit('video.turn-completed', {
      turnId: updated.id,
      sessionId: updated.sessionId,
      mediaAssetId: asset.id,
      creditReservationId: updated.creditReservationId,
      actorId,
    });

    return updated;
  }

  async finalizeFailed(
    turn: VideoEditTurn,
    reason: string,
    actorId: string,
  ): Promise<VideoEditTurn> {
    const patch = failTurn(turn, reason);
    if (patch === null) {
      return turn;
    }

    this.logger.warn(`Video turn ${turn.id} failed: ${reason}`);
    const updated = await this.turnsRepository.update(turn.id, patch, actorId);

    this.eventEmitter.emit('video.turn-failed', {
      turnId: updated.id,
      sessionId: updated.sessionId,
      creditReservationId: updated.creditReservationId,
      reason,
      actorId,
    });

    return updated;
  }
}
