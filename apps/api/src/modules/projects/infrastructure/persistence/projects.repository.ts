import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Project } from '../../domain/entities/project.entity';
import {
  CreateProjectData,
  IProjectsRepository,
  UpdateProjectData,
} from '../../domain/repositories/project-repository.interface';
import { ProjectModel } from './project.model';

@Injectable()
export class ProjectsRepository
  extends BaseRepository<ProjectModel, Project, CreateProjectData, UpdateProjectData>
  implements IProjectsRepository
{
  constructor(@InjectModel(ProjectModel) model: typeof ProjectModel) {
    super(model);
  }

  protected toEntity(instance: ProjectModel): Project {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      campaignId: plain.campaignId,
      title: plain.title,
      category: plain.category,
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
