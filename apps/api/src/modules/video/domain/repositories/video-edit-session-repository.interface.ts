import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import {
  VideoEditSession,
  VideoEditSessionStatus,
} from '../entities/video-edit-session.entity';
import { VideoAspectRatio } from '../interfaces/conversational-video.port';

export interface CreateVideoEditSessionData {
  organizationId: string;
  workspaceId: string;
  title: string;
  provider: string;
  modelId: string;
  aspectRatio: VideoAspectRatio;
  status: VideoEditSessionStatus;
  rootTurnId?: string | null;
  latestTurnId?: string | null;
}

export type UpdateVideoEditSessionData = Partial<
  Omit<CreateVideoEditSessionData, 'organizationId' | 'workspaceId'>
>;

export interface IVideoEditSessionsRepository
  extends IBaseRepository<
    VideoEditSession,
    CreateVideoEditSessionData,
    UpdateVideoEditSessionData
  > {
  /**
   * Ownership-scoped lookup. Every mutation path resolves the session through
   * this rather than `findById`, so an authenticated caller cannot act on
   * another user's session (IDOR).
   */
  findOwned(id: string, actorId: string): Promise<VideoEditSession | null>;
}

export const VIDEO_EDIT_SESSIONS_REPOSITORY = Symbol('VIDEO_EDIT_SESSIONS_REPOSITORY');
