import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VideoEditSessionService } from './video-edit-session.service';
import { VideoTurnFinalizerService } from './video-turn-finalizer.service';
import { MockConversationalVideoProvider } from '../../infrastructure/providers/__tests__/mock-conversational-video.provider';
import { VideoEditSession, VideoEditSessionStatus } from '../../domain/entities/video-edit-session.entity';
import { VideoEditTurn } from '../../domain/entities/video-edit-turn.entity';
import { IVideoEditSessionsRepository } from '../../domain/repositories/video-edit-session-repository.interface';
import { IVideoEditTurnsRepository } from '../../domain/repositories/video-edit-turn-repository.interface';
import {
  VideoAspectRatio,
  VideoDelivery,
  VideoTask,
  VideoTurnStatus,
} from '../../domain/interfaces/conversational-video.port';
import { VideoCreditsService } from '@modules/video-credits/application/services/credits.service';
import { GenerationTier, StylePreset } from '@modules/video-credits/domain/enums/generation.enums';
import { StartVideoSessionDto } from '../dto/start-video-session.dto';

const ACTOR_ID = 'user-1';

function buildSession(overrides: Partial<VideoEditSession> = {}): VideoEditSession {
  return {
    id: 'session-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    title: 'Teaser',
    provider: 'mock-conversational',
    modelId: 'mock-model',
    aspectRatio: VideoAspectRatio.PORTRAIT,
    status: VideoEditSessionStatus.ACTIVE,
    rootTurnId: null,
    latestTurnId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: ACTOR_ID,
    updatedBy: ACTOR_ID,
    version: 0,
    ...overrides,
  };
}

function buildTurn(overrides: Partial<VideoEditTurn> = {}): VideoEditTurn {
  return {
    id: 'turn-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    sessionId: 'session-1',
    parentTurnId: null,
    providerTurnId: 'v1_mock_1',
    prompt: 'A cat',
    task: VideoTask.TEXT_TO_VIDEO,
    status: VideoTurnStatus.IN_PROGRESS,
    delivery: VideoDelivery.URI,
    sourceUri: null,
    mediaAssetId: null,
    editable: true,
    failureReason: null,
    tier: GenerationTier.FAST,
    style: StylePreset.REALISTIC,
    durationSeconds: 5,
    creditReservationId: 'res-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: ACTOR_ID,
    updatedBy: ACTOR_ID,
    version: 0,
    ...overrides,
  };
}

function buildDto(overrides: Partial<StartVideoSessionDto> = {}): StartVideoSessionDto {
  return {
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    title: 'Teaser',
    shots: [
      { startSecond: 0, endSecond: 5, description: 'A cat on a windowsill', referenceImageIndexes: [] },
    ],
    referenceImages: [],
    aspectRatio: VideoAspectRatio.PORTRAIT,
    tier: GenerationTier.FAST,
    style: StylePreset.REALISTIC,
    singleContinuousShot: true,
    negatives: [],
    ...overrides,
  } as StartVideoSessionDto;
}

describe('VideoEditSessionService', () => {
  let provider: MockConversationalVideoProvider;
  let sessionsRepository: jest.Mocked<IVideoEditSessionsRepository>;
  let turnsRepository: jest.Mocked<IVideoEditTurnsRepository>;
  let finalizer: jest.Mocked<VideoTurnFinalizerService>;
  let credits: jest.Mocked<VideoCreditsService>;
  let service: VideoEditSessionService;

  beforeEach(() => {
    provider = new MockConversationalVideoProvider();

    sessionsRepository = {
      create: jest.fn().mockResolvedValue(buildSession()),
      update: jest.fn().mockResolvedValue(buildSession({ latestTurnId: 'turn-1' })),
      findOwned: jest.fn().mockResolvedValue(buildSession()),
    } as unknown as jest.Mocked<IVideoEditSessionsRepository>;

    turnsRepository = {
      create: jest.fn().mockResolvedValue(buildTurn()),
      findById: jest.fn().mockResolvedValue(buildTurn({ status: VideoTurnStatus.COMPLETED })),
      findBySession: jest.fn().mockResolvedValue([buildTurn()]),
    } as unknown as jest.Mocked<IVideoEditTurnsRepository>;

    finalizer = {
      finalizeCompleted: jest
        .fn()
        .mockImplementation((turn: VideoEditTurn) =>
          Promise.resolve({ ...turn, status: VideoTurnStatus.COMPLETED, mediaAssetId: 'asset-1' }),
        ),
      finalizeFailed: jest
        .fn()
        .mockImplementation((turn: VideoEditTurn, reason: string) =>
          Promise.resolve({ ...turn, status: VideoTurnStatus.FAILED, failureReason: reason }),
        ),
    } as unknown as jest.Mocked<VideoTurnFinalizerService>;

    credits = {
      reserve: jest.fn().mockResolvedValue({
        reservationId: 'res-1',
        walletId: 'wallet-1',
        credits: 200,
        modelId: 'gemini-omni-flash-preview',
        provider: 'gemini-omni',
      }),
      refund: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<VideoCreditsService>;

    service = new VideoEditSessionService(
      provider,
      sessionsRepository,
      turnsRepository,
      finalizer,
      credits,
    );
  });

  it('compiles the scene graph into the prompt sent to the provider', async () => {
    await service.start(
      buildDto({
        negatives: ['dialogue'],
        audioDirection: 'Include calm background music.',
      }),
      ACTOR_ID,
    );

    expect(provider.lastStartRequest?.prompt).toContain('A cat on a windowsill');
    expect(provider.lastStartRequest?.prompt).toContain('No dialogue.');
    expect(provider.lastStartRequest?.prompt).toContain('Include calm background music.');
  });

  it('always requests server-side retention so the turn stays refinable', () => {
    return service.start(buildDto(), ACTOR_ID).then(() => {
      expect(provider.lastStartRequest?.store).toBe(true);
    });
  });

  it('requests URI delivery to stay under the inline payload cap', async () => {
    await service.start(buildDto(), ACTOR_ID);

    expect(provider.lastStartRequest?.delivery).toBe(VideoDelivery.URI);
  });

  it('resolves the task from the reference image roles', async () => {
    await service.start(
      buildDto({
        referenceImages: [{ data: 'AAA', mimeType: 'image/png', isFirstFrame: true }],
        shots: [
          { startSecond: 0, endSecond: 5, description: 'She walks off', referenceImageIndexes: [] },
        ],
      }),
      ACTOR_ID,
    );

    expect(provider.lastStartRequest?.task).toBe(VideoTask.IMAGE_TO_VIDEO);
  });

  it('rejects a scene longer than the model can generate before calling the vendor', async () => {
    await expect(
      service.start(
        buildDto({
          shots: [
            { startSecond: 0, endSecond: 30, description: 'A long take', referenceImageIndexes: [] },
          ],
        }),
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(provider.lastStartRequest).toBeNull();
  });

  it('records the root and latest turn on the session', async () => {
    await service.start(buildDto(), ACTOR_ID);

    expect(sessionsRepository.update).toHaveBeenCalledWith(
      'session-1',
      { rootTurnId: 'turn-1', latestTurnId: 'turn-1' },
      ACTOR_ID,
    );
  });

  it('routes a failed generation through the finalizer', async () => {
    provider.respondWith(VideoTurnStatus.FAILED);

    await service.start(buildDto(), ACTOR_ID);

    expect(finalizer.finalizeFailed).toHaveBeenCalled();
    expect(finalizer.finalizeCompleted).not.toHaveBeenCalled();
  });

  it('leaves a still-generating turn untouched', async () => {
    provider.respondWith(VideoTurnStatus.IN_PROGRESS);

    await service.start(buildDto(), ACTOR_ID);

    expect(finalizer.finalizeCompleted).not.toHaveBeenCalled();
    expect(finalizer.finalizeFailed).not.toHaveBeenCalled();
  });

  it('passes the vendor turn id as the parent when refining', async () => {
    await service.refine('session-1', 'turn-1', { instruction: 'Warmer lighting.' }, ACTOR_ID);

    expect(provider.lastRefineParentId).toBe('v1_mock_1');
    expect(provider.lastRefineInstruction).toBe('Warmer lighting.');
  });

  it('hides sessions owned by another user behind a 404', async () => {
    sessionsRepository.findOwned.mockResolvedValue(null);

    await expect(
      service.refine('session-1', 'turn-1', { instruction: 'Warmer.' }, 'someone-else'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to refine a turn belonging to a different session', async () => {
    turnsRepository.findById.mockResolvedValue(
      buildTurn({ sessionId: 'other-session', status: VideoTurnStatus.COMPLETED }),
    );

    await expect(
      service.refine('session-1', 'turn-1', { instruction: 'Warmer.' }, ACTOR_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('holds credits before spending anything at the vendor', async () => {
    await service.start(buildDto(), ACTOR_ID);

    expect(credits.reserve).toHaveBeenCalledTimes(1);
    const reserveOrder = credits.reserve.mock.invocationCallOrder[0];
    expect(reserveOrder).toBeLessThan(turnsRepository.create.mock.invocationCallOrder[0]);
  });

  it('prices from the tier, not from a caller-supplied model', async () => {
    await service.start(buildDto({ tier: GenerationTier.STUDIO }), ACTOR_ID);

    expect(credits.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ tier: GenerationTier.STUDIO }),
      'video.omni-session',
      ACTOR_ID,
    );
  });

  it('releases the hold when the vendor call throws', async () => {
    jest.spyOn(provider, 'start').mockRejectedValueOnce(new Error('vendor exploded'));

    await expect(service.start(buildDto(), ACTOR_ID)).rejects.toThrow('vendor exploded');
    expect(credits.refund).toHaveBeenCalledWith('res-1', 'vendor exploded', ACTOR_ID);
  });

  it('does not charge when the wallet has no credits, and never calls the vendor', async () => {
    credits.reserve.mockRejectedValueOnce(new Error('Insufficient credits'));

    await expect(service.start(buildDto(), ACTOR_ID)).rejects.toThrow('Insufficient credits');
    expect(provider.lastStartRequest).toBeNull();
  });

  it('charges a refine turn like a first generation', async () => {
    await service.refine('session-1', 'turn-1', { instruction: 'Warmer.' }, ACTOR_ID);

    expect(credits.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ tier: GenerationTier.FAST, durationSeconds: 5 }),
      'video.omni-refine',
      ACTOR_ID,
    );
  });
});