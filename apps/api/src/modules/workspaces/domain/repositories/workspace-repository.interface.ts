import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Workspace, WorkspaceStatus } from '../entities/workspace.entity';

export interface CreateWorkspaceData {
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  status?: WorkspaceStatus;
}

export type UpdateWorkspaceData = Partial<Omit<CreateWorkspaceData, 'organizationId'>>;

export const WORKSPACES_REPOSITORY = Symbol('WORKSPACES_REPOSITORY');

export interface IWorkspacesRepository extends IBaseRepository<
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData
> {
  findBySlug(organizationId: string, slug: string): Promise<Workspace | null>;
  listByOrganization(organizationId: string): Promise<Workspace[]>;
}
