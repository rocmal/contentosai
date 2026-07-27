import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface CalendarEvent extends BaseTenantEntity {
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  contentId: string | null;
  campaignId: string | null;
}
