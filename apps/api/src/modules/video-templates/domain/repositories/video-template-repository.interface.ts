import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { VideoTemplate, VideoTemplateVisibility } from '../entities/video-template.entity';

export interface CreateVideoTemplateData {
  organizationId: string;
  workspaceId: string;
  title: string;
  videoUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  aspectRatio: string;
  durationSeconds?: number | null;
  visibility?: VideoTemplateVisibility;
}

export type UpdateVideoTemplateData = Partial<
  Omit<CreateVideoTemplateData, 'organizationId' | 'workspaceId'>
>;

export const VIDEO_TEMPLATES_REPOSITORY = Symbol('VIDEO_TEMPLATES_REPOSITORY');

export type IVideoTemplatesRepository = IBaseRepository<
  VideoTemplate,
  CreateVideoTemplateData,
  UpdateVideoTemplateData
>;
