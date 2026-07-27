import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { AnalyticsEvent } from '../../domain/entities/analytics-event.entity';
import {
  ANALYTICS_EVENTS_REPOSITORY,
  IAnalyticsEventsRepository,
} from '../../domain/repositories/analytics-event-repository.interface';
import { CreateAnalyticsEventDto } from '../dto/create-analytics-event.dto';
import { UpdateAnalyticsEventDto } from '../dto/update-analytics-event.dto';
import { AnalyticsEventCreatedEvent } from '../events/analytics-event-created.event';

@Injectable()
export class AnalyticsEventsService {
  constructor(
    @Inject(ANALYTICS_EVENTS_REPOSITORY)
    private readonly analyticsEventsRepository: IAnalyticsEventsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAnalyticsEventDto, actorId?: string): Promise<AnalyticsEvent> {
    const analyticsEvent = await this.analyticsEventsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        eventName: dto.eventName,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        metadata: dto.metadata ?? null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
      actorId,
    );

    this.eventEmitter.emit(
      'analytics.created',
      new AnalyticsEventCreatedEvent(analyticsEvent.id, analyticsEvent.workspaceId),
    );

    return analyticsEvent;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<AnalyticsEvent>> {
    return this.analyticsEventsRepository.findAll(options);
  }

  async findById(id: string): Promise<AnalyticsEvent> {
    const analyticsEvent = await this.analyticsEventsRepository.findById(id);
    if (!analyticsEvent) {
      throw new NotFoundException(`AnalyticsEvent with id "${id}" not found`);
    }
    return analyticsEvent;
  }

  async update(
    id: string,
    dto: UpdateAnalyticsEventDto,
    actorId?: string,
  ): Promise<AnalyticsEvent> {
    await this.findById(id);
    return this.analyticsEventsRepository.update(
      id,
      {
        eventName: dto.eventName,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: dto.metadata,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.analyticsEventsRepository.delete(id, actorId);
  }
}
