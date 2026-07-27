import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Workspace } from '../../domain/entities/workspace.entity';
import {
  CreateWorkspaceData,
  IWorkspacesRepository,
  UpdateWorkspaceData,
} from '../../domain/repositories/workspace-repository.interface';
import { WorkspaceModel } from './workspace.model';

@Injectable()
export class WorkspacesRepository
  extends BaseRepository<WorkspaceModel, Workspace, CreateWorkspaceData, UpdateWorkspaceData>
  implements IWorkspacesRepository
{
  constructor(@InjectModel(WorkspaceModel) model: typeof WorkspaceModel) {
    super(model);
  }

  async findBySlug(organizationId: string, slug: string): Promise<Workspace | null> {
    return this.findOne({ organizationId, slug });
  }

  async listByOrganization(organizationId: string): Promise<Workspace[]> {
    const instances = await this.model.findAll({ where: { organizationId } });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: WorkspaceModel): Workspace {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      name: plain.name,
      slug: plain.slug,
      description: plain.description,
      status: plain.status,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
