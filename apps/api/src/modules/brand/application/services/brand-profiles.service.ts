import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { BrandProfile } from '../../domain/entities/brand-profile.entity';
import {
  BRAND_PROFILES_REPOSITORY,
  IBrandProfilesRepository,
} from '../../domain/repositories/brand-profile-repository.interface';
import { CreateBrandProfileDto } from '../dto/create-brand-profile.dto';
import { UpdateBrandProfileDto } from '../dto/update-brand-profile.dto';
import { BrandProfileCreatedEvent } from '../events/brand-profile-created.event';

@Injectable()
export class BrandProfilesService {
  constructor(
    @Inject(BRAND_PROFILES_REPOSITORY)
    private readonly brandProfilesRepository: IBrandProfilesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateBrandProfileDto, actorId?: string): Promise<BrandProfile> {
    const brandProfile = await this.brandProfilesRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        name: dto.name,
        industry: dto.industry ?? null,
        toneOfVoice: dto.toneOfVoice ?? null,
        brandColors: dto.brandColors ?? null,
        logoUrl: dto.logoUrl ?? null,
        guidelines: dto.guidelines ?? null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'brand.created',
      new BrandProfileCreatedEvent(brandProfile.id, brandProfile.workspaceId),
    );

    return brandProfile;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<BrandProfile>> {
    return this.brandProfilesRepository.findAll(options);
  }

  async findByWorkspace(workspaceId: string): Promise<BrandProfile[]> {
    return this.brandProfilesRepository.listByWorkspace(workspaceId);
  }

  async findById(id: string): Promise<BrandProfile> {
    const brandProfile = await this.brandProfilesRepository.findById(id);
    if (!brandProfile) {
      throw new NotFoundException(`BrandProfile with id "${id}" not found`);
    }
    return brandProfile;
  }

  async update(id: string, dto: UpdateBrandProfileDto, actorId?: string): Promise<BrandProfile> {
    await this.findById(id);
    return this.brandProfilesRepository.update(
      id,
      {
        name: dto.name,
        industry: dto.industry,
        toneOfVoice: dto.toneOfVoice,
        brandColors: dto.brandColors,
        logoUrl: dto.logoUrl,
        guidelines: dto.guidelines,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.brandProfilesRepository.delete(id, actorId);
  }
}
