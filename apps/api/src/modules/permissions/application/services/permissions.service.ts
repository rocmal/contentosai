import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Permission } from '../../domain/entities/permission.entity';
import {
  IPermissionsRepository,
  PERMISSIONS_REPOSITORY,
} from '../../domain/repositories/permission-repository.interface';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: IPermissionsRepository,
  ) {}

  async create(dto: CreatePermissionDto, actorId?: string): Promise<Permission> {
    const existing = await this.permissionsRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Permission with slug "${dto.slug}" already exists`);
    }
    return this.permissionsRepository.create(dto, actorId);
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Permission>> {
    return this.permissionsRepository.findAll(options);
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }
    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto, actorId?: string): Promise<Permission> {
    await this.findById(id);
    return this.permissionsRepository.update(id, dto, actorId);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.permissionsRepository.delete(id, actorId);
  }
}
