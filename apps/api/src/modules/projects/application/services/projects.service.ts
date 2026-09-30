import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import {
  CONTENT_REPOSITORY,
  IContentRepository,
} from '@modules/content/domain/repositories/content-repository.interface';
import { Project } from '../../domain/entities/project.entity';
import {
  IProjectsRepository,
  PROJECTS_REPOSITORY,
} from '../../domain/repositories/project-repository.interface';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECTS_REPOSITORY) private readonly projectsRepository: IProjectsRepository,
    @Inject(CONTENT_REPOSITORY) private readonly contentRepository: IContentRepository,
  ) {}

  /** Content-item counts for the given projects, keyed by project id. */
  async contentCounts(projects: Project[]): Promise<Record<string, number>> {
    return this.contentRepository.countByProject(projects.map((p) => p.id));
  }

  async create(dto: CreateProjectDto, actorId?: string): Promise<Project> {
    return this.projectsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        campaignId: dto.campaignId ?? null,
        title: dto.title,
        category: dto.category,
        description: dto.description ?? null,
        status: dto.status,
      },
      actorId,
    );
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Project>> {
    return this.projectsRepository.findAll(options);
  }

  async findById(id: string): Promise<Project> {
    const project = await this.projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with id "${id}" not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, actorId?: string): Promise<Project> {
    await this.findById(id);
    return this.projectsRepository.update(
      id,
      {
        campaignId: dto.campaignId,
        title: dto.title,
        category: dto.category,
        description: dto.description,
        status: dto.status,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.projectsRepository.delete(id, actorId);
  }
}
