import { VideoEditTurn } from './video-edit-turn.entity';
import {
  InvalidTurnTransitionError,
  TurnNotRefinableError,
  assertRefinable,
  completeTurn,
  failTurn,
} from './video-edit-turn.rules';
import {
  VideoDelivery,
  VideoTask,
  VideoTurnStatus,
} from '../interfaces/conversational-video.port';
import { GenerationTier, StylePreset } from '@modules/video-credits/domain/enums/generation.enums';

function turn(overrides: Partial<VideoEditTurn> = {}): VideoEditTurn {
  return {
    id: 'turn-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    sessionId: 'session-1',
    parentTurnId: null,
    providerTurnId: 'v1_abc',
    prompt: 'A cat on a windowsill',
    task: VideoTask.TEXT_TO_VIDEO,
    status: VideoTurnStatus.IN_PROGRESS,
    delivery: VideoDelivery.URI,
    sourceUri: null,
    mediaAssetId: null,
    editable: true,
    failureReason: null,
    tier: GenerationTier.FAST,
    style: StylePreset.REALISTIC,
    durationSeconds: 8,
    creditReservationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    version: 0,
    ...overrides,
  };
}

describe('completeTurn', () => {
  it('produces a completion patch from in_progress', () => {
    const patch = completeTurn(turn(), 'asset-1');

    expect(patch).toEqual({
      status: VideoTurnStatus.COMPLETED,
      mediaAssetId: 'asset-1',
      failureReason: null,
    });
  });

  it('is a no-op when already completed, so double delivery is harmless', () => {
    // Webhook delivery and the reconciliation sweep can both observe the same
    // completion; the second one must not error.
    const patch = completeTurn(turn({ status: VideoTurnStatus.COMPLETED }), 'asset-1');

    expect(patch).toBeNull();
  });

  it('refuses to resurrect a failed turn', () => {
    expect(() => completeTurn(turn({ status: VideoTurnStatus.FAILED }), 'asset-1')).toThrow(
      InvalidTurnTransitionError,
    );
  });
});

describe('failTurn', () => {
  it('produces a failure patch from in_progress', () => {
    expect(failTurn(turn(), 'safety filter')).toEqual({
      status: VideoTurnStatus.FAILED,
      failureReason: 'safety filter',
    });
  });

  it('is a no-op when already failed', () => {
    expect(failTurn(turn({ status: VideoTurnStatus.FAILED }), 'again')).toBeNull();
  });

  it('refuses to fail a completed turn', () => {
    expect(() => failTurn(turn({ status: VideoTurnStatus.COMPLETED }), 'late error')).toThrow(
      InvalidTurnTransitionError,
    );
  });
});

describe('assertRefinable', () => {
  it('accepts a completed, retained turn', () => {
    expect(() =>
      assertRefinable(turn({ status: VideoTurnStatus.COMPLETED, editable: true })),
    ).not.toThrow();
  });

  it('rejects a turn that is still generating', () => {
    expect(() => assertRefinable(turn())).toThrow(TurnNotRefinableError);
  });

  it('rejects a turn generated without server-side retention', () => {
    expect(() =>
      assertRefinable(turn({ status: VideoTurnStatus.COMPLETED, editable: false })),
    ).toThrow(TurnNotRefinableError);
  });
});
