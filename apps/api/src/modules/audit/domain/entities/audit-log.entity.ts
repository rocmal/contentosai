import { BaseEntity } from '@shared/domain/base.entity';

export interface AuditLog extends BaseEntity {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
}
