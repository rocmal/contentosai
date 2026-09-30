import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Project, ProjectStatus } from '../entities/project.entity';

export interface CreateProjectData {
  organizationId: string;
  workspaceId: string;
  campaignId?: string | null;
  title: string;
  category?: string;
  description?: string | null;
  status?: ProjectStatus;
}

export type UpdateProjectData = Partial<Omit<CreateProjectData, 'organizationId' | 'workspaceId'>>;

export const PROJECTS_REPOSITORY = Symbol('PROJECTS_REPOSITORY');

export type IProjectsRepository = IBaseRepository<Project, CreateProjectData, UpdateProjectData>;
