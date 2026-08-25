import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { VideoEditSession, VideoEditSessionStatus } from '../../domain/entities/video-edit-session.entity';
import { VideoEditTurn } from '../../domain/entities/video-edit-turn.entity';
import { assertRefinable } from '../../domain/entities/video-edit-turn.rules';
import {
  IVideoEditSessionsRepository,
  VIDEO_EDIT_SESSIONS_REPOSITORY,
} from '../../domain/repositories/video-edit-session-repository.interface';
import {
  IVideoEditTurnsRepository,
  VIDEO_EDIT_TURNS_REPOSITORY,
} from '../../domain/repositories/video-edit-turn-repository.interface';
import {
  CONVERSATIONAL_VIDEO_PROVIDER,
  IConversationalVideoProvider,
  ReferenceImage,
  VideoDelivery,
  VideoTask,
  VideoTurnResult,
  VideoTurnStatus,
} from '../../domain/interfaces/conversational-video.port';
import {
  SceneGraph,
  compileOmniPrompt,
  sceneGraphDurationSeconds,
} from '../../domain/services/omni-prompt-compiler';
import {
  VideoCreditsService,
  VideoCreditReservation,
} from '@modules/video-credits/application/services/credits.service';
import { GenerationMode } from '@modules/video-credits/domain/enums/generation.enums';
import { StartVideoSessionDto } from '../dto/start-video-session.dto';
import { RefineVideoTurnDto } from '../dto/refine-video-turn.dto';
import { VideoTurnFinalizerService } from './video-turn-finalizer.service';

interface BillingContext {
  readonly tier: StartVideoSessionDto['tier'];
  readonly style: StartVideoSessionDto['style'];
  readonly durationSeconds: number;
  readonly reservation: VideoCreditReservation;
}

export interface SessionWithTurns {
  readonly session: VideoEditSession;
  readonly turns: VideoEditTurn[];
}

/**
 * Orchestration only. Prompt construction lives in the domain compiler, state
 * transitions live in the domain rules, and vendor I/O lives behind the port -
 * this service wires them together and owns persistence ordering.
 */
@Injectable()
export class VideoEditSessionService {
  constructor(
    @Inject(CONVERSATIONAL_VIDEO_PROVIDER)
    private readonly provider: IConversationalVideoProvider,
    @Inject(VIDEO_EDIT_SESSIONS_REPOSITORY)
    private readonly sessionsRepository: IVideoEditSessionsRepository,
    @Inject(VIDEO_EDIT_TURNS_REPOSITORY)
    private readonly turnsRepository: IVideoEditTurnsRepository,
    private readonly finalizer: VideoTurnFinalizerService,
    private readonly credits: VideoCreditsService,
  ) {}

  async start(dto: StartVideoSessionDto, actorId: string): Promise<SessionWithTurns> {
    const capabilities = this.provider.capabilities();
    const graph = this.toSceneGraph(dto);

    const duration = sceneGraphDurationSeconds(graph);
    if (duration > capabilities.maxDurationSeconds) {
      throw new UnprocessableEntityException(
        `${capabilities.modelId} generates at most ${capabilities.maxDurationSeconds}s; this scene is ${duration}s`,
      );
    }
    if (!capabilities.aspectRatios.includes(dto.aspectRatio)) {
      throw new UnprocessableEntityException(
        `${capabilities.modelId} does not support aspect ratio ${dto.aspectRatio}`,
      );
    }

    const prompt = compileOmniPrompt(graph);
    const task = this.resolveTask(graph.referenceImages);

    const session = await this.sessionsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        title: dto.title,
        provider: this.provider.name,
        modelId: capabilities.modelId,
        aspectRatio: dto.aspectRatio,
        status: VideoEditSessionStatus.ACTIVE,
      },
      actorId,
    );

    // Hold credits before any vendor spend. Reserving first means the balance
    // check and the deduction are one atomic operation, so two concurrent
    // submits cannot both pass and overdraw the wallet.
    const reservation = await this.credits.reserve(
      {
        organizationId: dto.organizationId,
        tier: dto.tier,
        mode: this.toMode(task),
        style: dto.style,
        quantity: duration,
        durationSeconds: duration,
        requiresStatefulEditing: true,
      },
      'video.omni-session',
      actorId,
    );

    const result = await this.withRefundOnFailure(reservation, actorId, () =>
      this.provider.start({
        prompt,
        task,
        aspectRatio: dto.aspectRatio,
        referenceImages: graph.referenceImages,
        // Retention is always on: a turn created without it cannot be refined,
        // which would defeat the point of a session.
        store: true,
        background: true,
        delivery: VideoDelivery.URI,
      }),
    );

    const turn = await this.persistTurn(
      session,
      null,
      prompt,
      task,
      result,
      actorId,
      { tier: dto.tier, style: dto.style, durationSeconds: duration, reservation },
    );
    const finalized = await this.settle(turn, result, actorId);

    const updatedSession = await this.sessionsRepository.update(
      session.id,
      { rootTurnId: finalized.id, latestTurnId: finalized.id },
      actorId,
    );

    return { session: updatedSession, turns: [finalized] };
  }

  async refine(
    sessionId: string,
    turnId: string,
    dto: RefineVideoTurnDto,
    actorId: string,
  ): Promise<VideoEditTurn> {
    const session = await this.requireOwnedSession(sessionId, actorId);
    const parent = await this.requireTurnInSession(turnId, session.id);

    assertRefinable(parent);

    // A refine is a full generation at full vendor price - no discount is
    // given for reusing server-side state - so it is charged like any other.
    const reservation = await this.credits.reserve(
      {
        organizationId: session.organizationId,
        tier: parent.tier,
        mode: GenerationMode.VIDEO_TO_VIDEO,
        style: parent.style,
        quantity: parent.durationSeconds,
        durationSeconds: parent.durationSeconds,
        requiresStatefulEditing: true,
      },
      'video.omni-refine',
      actorId,
    );

    const result = await this.withRefundOnFailure(reservation, actorId, () =>
      this.provider.refine(parent.providerTurnId, dto.instruction, {
        aspectRatio: session.aspectRatio,
        store: true,
        background: true,
        delivery: VideoDelivery.URI,
      }),
    );

    const turn = await this.persistTurn(
      session,
      parent,
      dto.instruction,
      VideoTask.EDIT,
      result,
      actorId,
      {
        tier: parent.tier,
        style: parent.style,
        durationSeconds: parent.durationSeconds,
        reservation,
      },
    );
    const finalized = await this.settle(turn, result, actorId);

    await this.sessionsRepository.update(session.id, { latestTurnId: finalized.id }, actorId);
    return finalized;
  }

  /** Poll a still-running turn and settle it if the vendor has finished. */
  async reconcile(turn: VideoEditTurn, actorId: string): Promise<VideoEditTurn> {
    if (turn.status !== VideoTurnStatus.IN_PROGRESS) {
      return turn;
    }
    const result = await this.provider.getTurn(turn.providerTurnId);
    return this.settle(turn, result, actorId);
  }

  async findOwnedWithTurns(sessionId: string, actorId: string): Promise<SessionWithTurns> {
    const session = await this.requireOwnedSession(sessionId, actorId);
    const turns = await this.turnsRepository.findBySession(session.id);
    return { session, turns };
  }

  private async settle(
    turn: VideoEditTurn,
    result: VideoTurnResult,
    actorId: string,
  ): Promise<VideoEditTurn> {
    if (result.status === VideoTurnStatus.FAILED) {
      return this.finalizer.finalizeFailed(
        turn,
        result.failureReason ?? 'Generation failed',
        actorId,
      );
    }
    if (result.status === VideoTurnStatus.COMPLETED && result.payload !== null) {
      return this.finalizer.finalizeCompleted(turn, result.payload, actorId);
    }
    return turn;
  }

  private async persistTurn(
    session: VideoEditSession,
    parent: VideoEditTurn | null,
    prompt: string,
    task: VideoTask,
    result: VideoTurnResult,
    actorId: string,
    billing: BillingContext,
  ): Promise<VideoEditTurn> {
    return this.turnsRepository.create(
      {
        organizationId: session.organizationId,
        workspaceId: session.workspaceId,
        sessionId: session.id,
        parentTurnId: parent?.id ?? null,
        providerTurnId: result.providerTurnId,
        prompt,
        task,
        status: VideoTurnStatus.IN_PROGRESS,
        delivery: VideoDelivery.URI,
        sourceUri: result.payload?.kind === VideoDelivery.URI ? result.payload.uri : null,
        editable: true,
        failureReason: null,
        tier: billing.tier,
        style: billing.style,
        durationSeconds: billing.durationSeconds,
        creditReservationId: billing.reservation.reservationId,
      },
      actorId,
    );
  }

  /**
   * Releases the hold if the vendor call throws. Without this, a network error
   * would leave credits reserved forever with no turn row to settle them
   * against - the hold would only be recovered by the stale-reservation sweep.
   */
  private async withRefundOnFailure<T>(
    reservation: VideoCreditReservation,
    actorId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'vendor call failed';
      await this.credits.refund(reservation.reservationId, reason, actorId);
      throw error;
    }
  }

  private toMode(task: VideoTask): GenerationMode {
    switch (task) {
      case VideoTask.IMAGE_TO_VIDEO:
        return GenerationMode.IMAGE_TO_VIDEO;
      case VideoTask.REFERENCE_TO_VIDEO:
        return GenerationMode.IMAGE_TO_VIDEO;
      case VideoTask.EDIT:
        return GenerationMode.VIDEO_TO_VIDEO;
      default:
        return GenerationMode.TEXT_TO_VIDEO;
    }
  }

  private async requireOwnedSession(
    sessionId: string,
    actorId: string,
  ): Promise<VideoEditSession> {
    const session = await this.sessionsRepository.findOwned(sessionId, actorId);
    if (!session) {
      // Deliberately indistinguishable from "does not exist" so the endpoint
      // cannot be used to probe for other tenants' session ids.
      throw new NotFoundException(`Video edit session "${sessionId}" not found`);
    }
    if (session.status !== VideoEditSessionStatus.ACTIVE) {
      throw new ForbiddenException('This session is archived and can no longer be edited');
    }
    return session;
  }

  private async requireTurnInSession(
    turnId: string,
    sessionId: string,
  ): Promise<VideoEditTurn> {
    const turn = await this.turnsRepository.findById(turnId);
    if (!turn || turn.sessionId !== sessionId) {
      throw new NotFoundException(`Turn "${turnId}" not found in session "${sessionId}"`);
    }
    return turn;
  }

  private toSceneGraph(dto: StartVideoSessionDto): SceneGraph {
    return {
      shots: dto.shots.map((shot) => ({
        startSecond: shot.startSecond,
        endSecond: shot.endSecond,
        description: shot.description,
        referenceImageIndexes: shot.referenceImageIndexes,
      })),
      singleContinuousShot: dto.singleContinuousShot,
      // Brand Brain directives are injected by the caller layer; the model
      // has no system-instruction channel, so they are compiled into the text.
      brandDirectives: [],
      metaDirectives: [],
      audioDirection: dto.audioDirection ?? null,
      negatives: dto.negatives,
      referenceImages: dto.referenceImages.map((image) => ({
        data: image.data,
        mimeType: image.mimeType,
        isFirstFrame: image.isFirstFrame,
      })),
    };
  }

  private resolveTask(images: readonly ReferenceImage[]): VideoTask {
    if (images.length === 0) {
      return VideoTask.TEXT_TO_VIDEO;
    }
    return images.some((image) => image.isFirstFrame)
      ? VideoTask.IMAGE_TO_VIDEO
      : VideoTask.REFERENCE_TO_VIDEO;
  }
}
