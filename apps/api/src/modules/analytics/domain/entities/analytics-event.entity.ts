import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface AnalyticsEvent extends BaseTenantEntity {
  eventName: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}
