import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import {
  VideoProject,
  VideoProjectScene,
  VideoProjectSource,
  VideoProjectStatus,
} from '../entities/video-project.entity';

export interface CreateVideoProjectData {
  organizationId: string;
  workspaceId: string;
  title: string;
  source: VideoProjectSource;
  status?: VideoProjectStatus;
  scenes?: VideoProjectScene[];
  aspectRatio?: string;
  transition?: string;
  narrationText?: string | null;
  narrationVoiceId?: string | null;
  narrationGender?: string | null;
  narrationLanguage?: string | null;
  finalAssetId?: string | null;
}

export type UpdateVideoProjectData = Partial<
  Omit<CreateVideoProjectData, 'organizationId' | 'workspaceId' | 'source'>
>;

export const VIDEO_PROJECTS_REPOSITORY = Symbol('VIDEO_PROJECTS_REPOSITORY');

export type IVideoProjectsRepository = IBaseRepository<
  VideoProject,
  CreateVideoProjectData,
  UpdateVideoProjectData
>;
