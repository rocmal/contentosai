import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { AnalyticsEvent } from '../entities/analytics-event.entity';

export interface CreateAnalyticsEventData {
  organizationId: string;
  workspaceId: string;
  eventName: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
}

export type UpdateAnalyticsEventData = Partial<
  Omit<CreateAnalyticsEventData, 'organizationId' | 'workspaceId'>
>;

export const ANALYTICS_EVENTS_REPOSITORY = Symbol('ANALYTICS_EVENTS_REPOSITORY');

export type IAnalyticsEventsRepository = IBaseRepository<
  AnalyticsEvent,
  CreateAnalyticsEventData,
  UpdateAnalyticsEventData
>;
