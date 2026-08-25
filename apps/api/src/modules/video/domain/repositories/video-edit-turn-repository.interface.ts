import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { GenerationTier, StylePreset } from '@modules/video-credits/domain/enums/generation.enums';
import { VideoEditTurn } from '../entities/video-edit-turn.entity';
import {
  VideoDelivery,
  VideoTask,
  VideoTurnStatus,
} from '../interfaces/conversational-video.port';

export interface CreateVideoEditTurnData {
  organizationId: string;
  workspaceId: string;
  sessionId: string;
  parentTurnId: string | null;
  providerTurnId: string;
  prompt: string;
  task: VideoTask;
  status: VideoTurnStatus;
  delivery: VideoDelivery;
  sourceUri?: string | null;
  mediaAssetId?: string | null;
  editable: boolean;
  failureReason?: string | null;
  tier: GenerationTier;
  style: StylePreset;
  durationSeconds: number;
  creditReservationId?: string | null;
}

export type UpdateVideoEditTurnData = Partial<
  Omit<
    CreateVideoEditTurnData,
    'organizationId' | 'workspaceId' | 'sessionId' | 'parentTurnId' | 'providerTurnId'
  >
>;

export interface IVideoEditTurnsRepository
  extends IBaseRepository<VideoEditTurn, CreateVideoEditTurnData, UpdateVideoEditTurnData> {
  findBySession(sessionId: string): Promise<VideoEditTurn[]>;
  findByProviderTurnId(providerTurnId: string): Promise<VideoEditTurn | null>;
  /** Reconciliation sweep: turns still in progress past the stale threshold. */
  findStaleInProgress(olderThan: Date, limit: number): Promise<VideoEditTurn[]>;
}

export const VIDEO_EDIT_TURNS_REPOSITORY = Symbol('VIDEO_EDIT_TURNS_REPOSITORY');
