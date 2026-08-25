import { VideoEditTurn } from './video-edit-turn.entity';
import { VideoTurnStatus } from '../interfaces/conversational-video.port';

export class InvalidTurnTransitionError extends Error {
  constructor(turnId: string, from: VideoTurnStatus, to: VideoTurnStatus) {
    super(`Turn "${turnId}" cannot transition from "${from}" to "${to}"`);
    this.name = 'InvalidTurnTransitionError';
  }
}

export class TurnNotRefinableError extends Error {
  constructor(turnId: string, reason: string) {
    super(`Turn "${turnId}" cannot be refined: ${reason}`);
    this.name = 'TurnNotRefinableError';
  }
}

export interface TurnCompletionPatch {
  readonly status: VideoTurnStatus.COMPLETED;
  readonly mediaAssetId: string;
  readonly failureReason: null;
}

export interface TurnFailurePatch {
  readonly status: VideoTurnStatus.FAILED;
  readonly failureReason: string;
}

/**
 * Pure state-machine rules. Entities in this codebase are plain data shapes,
 * so transitions live here as free functions: no ORM, no DI, no I/O, and
 * therefore trivially unit-testable.
 *
 * `completeTurn` and `failTurn` return null for a no-op because completion is
 * reachable from both the webhook path and the poll-reconciliation path; one
 * of the two must be idempotent rather than an error.
 */
export function completeTurn(
  turn: VideoEditTurn,
  mediaAssetId: string,
): TurnCompletionPatch | null {
  if (turn.status === VideoTurnStatus.COMPLETED) {
    return null;
  }
  if (turn.status === VideoTurnStatus.FAILED) {
    throw new InvalidTurnTransitionError(turn.id, turn.status, VideoTurnStatus.COMPLETED);
  }
  return { status: VideoTurnStatus.COMPLETED, mediaAssetId, failureReason: null };
}

export function failTurn(turn: VideoEditTurn, reason: string): TurnFailurePatch | null {
  if (turn.status === VideoTurnStatus.FAILED) {
    return null;
  }
  if (turn.status === VideoTurnStatus.COMPLETED) {
    throw new InvalidTurnTransitionError(turn.id, turn.status, VideoTurnStatus.FAILED);
  }
  return { status: VideoTurnStatus.FAILED, failureReason: reason };
}

export function assertRefinable(turn: VideoEditTurn): void {
  if (turn.status !== VideoTurnStatus.COMPLETED) {
    throw new TurnNotRefinableError(turn.id, `status is "${turn.status}", expected "completed"`);
  }
  if (!turn.editable) {
    throw new TurnNotRefinableError(turn.id, 'it was generated without server-side retention');
  }
}
