import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Workspace } from '../../domain/entities/workspace.entity';
import {
  IWorkspacesRepository,
  WORKSPACES_REPOSITORY,
} from '../../domain/repositories/workspace-repository.interface';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(WORKSPACES_REPOSITORY) private readonly workspacesRepository: IWorkspacesRepository,
  ) {}

  async create(dto: CreateWorkspaceDto, actorId?: string): Promise<Workspace> {
    const existing = await this.workspacesRepository.findBySlug(dto.organizationId, dto.slug);
    if (existing) {
      throw new ConflictException(
        `Workspace with slug "${dto.slug}" already exists in this organization`,
      );
    }
    return this.workspacesRepository.create(
      {
        organizationId: dto.organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
      },
      actorId,
    );
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Workspace>> {
    return this.workspacesRepository.findAll(options);
  }

  async findByOrganization(organizationId: string): Promise<Workspace[]> {
    return this.workspacesRepository.listByOrganization(organizationId);
  }

  async findById(id: string): Promise<Workspace> {
    const workspace = await this.workspacesRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace with id "${id}" not found`);
    }
    return workspace;
  }

  async update(id: string, dto: UpdateWorkspaceDto, actorId?: string): Promise<Workspace> {
    await this.findById(id);
    return this.workspacesRepository.update(id, dto, actorId);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.workspacesRepository.delete(id, actorId);
  }
}
