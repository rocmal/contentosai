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

export type IAuditLogsRepository = IBaseRepository<
  AuditLog,
  CreateAuditLogData,
  UpdateAuditLogData
>;
