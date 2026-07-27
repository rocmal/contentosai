import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { AnalyticsEvent } from '../../domain/entities/analytics-event.entity';
import {
  CreateAnalyticsEventData,
  IAnalyticsEventsRepository,
  UpdateAnalyticsEventData,
} from '../../domain/repositories/analytics-event-repository.interface';
import { AnalyticsEventModel } from './analytics-event.model';

@Injectable()
export class AnalyticsEventsRepository
  extends BaseRepository<
    AnalyticsEventModel,
    AnalyticsEvent,
    CreateAnalyticsEventData,
    UpdateAnalyticsEventData
  >
  implements IAnalyticsEventsRepository
{
  constructor(@InjectModel(AnalyticsEventModel) model: typeof AnalyticsEventModel) {
    super(model);
  }

  protected toEntity(instance: AnalyticsEventModel): AnalyticsEvent {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      eventName: plain.eventName,
      entityType: plain.entityType,
      entityId: plain.entityId,
      metadata: plain.metadata,
      occurredAt: plain.occurredAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
