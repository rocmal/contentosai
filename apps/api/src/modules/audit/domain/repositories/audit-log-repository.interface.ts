import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogData {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export type UpdateAuditLogData = Partial<CreateAuditLogData>;

export const AUDIT_LOGS_REPOSITORY = Symbol('AUDIT_LOGS_REPOSITORY');

export interface ListRecentAuditLogsOptions {
  organizationId?: string;
  /** e.g. 'admin.' for what Lumora's platform admins did. */
  actionPrefix?: string;
  limit: number;
}

export interface IAuditLogsRepository extends IBaseRepository<
  AuditLog,
  CreateAuditLogData,
  UpdateAuditLogData
> {
  /** Newest first. */
  listRecent(options: ListRecentAuditLogsOptions): Promise<AuditLog[]>;
}
