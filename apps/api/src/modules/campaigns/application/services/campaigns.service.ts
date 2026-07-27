import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Campaign } from '../../domain/entities/campaign.entity';
import {
  CAMPAIGNS_REPOSITORY,
  ICampaignsRepository,
} from '../../domain/repositories/campaign-repository.interface';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignCreatedEvent } from '../events/campaign-created.event';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY) private readonly campaignsRepository: ICampaignsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateCampaignDto, actorId?: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'campaign.created',
      new CampaignCreatedEvent(campaign.id, campaign.workspaceId),
    );

    return campaign;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Campaign>> {
    return this.campaignsRepository.findAll(options);
  }

  async findByWorkspace(workspaceId: string): Promise<Campaign[]> {
    return this.campaignsRepository.listByWorkspace(workspaceId);
  }

  async findById(id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findById(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, actorId?: string): Promise<Campaign> {
    await this.findById(id);
    return this.campaignsRepository.update(
      id,
      {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.campaignsRepository.delete(id, actorId);
  }
}
