import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import {
  AUDIT_LOGS_REPOSITORY,
  IAuditLogsRepository,
} from '../../domain/repositories/audit-log-repository.interface';

export interface RecordAuditLogInput {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOGS_REPOSITORY) private readonly auditLogsRepository: IAuditLogsRepository,
  ) {}

  /** System write - no actor id, since the log itself is the audit trail. */
  async record(input: RecordAuditLogInput): Promise<AuditLog> {
    return this.auditLogsRepository.create({
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      changes: input.changes ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<AuditLog>> {
    return this.auditLogsRepository.findAll(options);
  }

  async findById(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogsRepository.findById(id);
    if (!auditLog) {
      throw new NotFoundException(`Audit log with id "${id}" not found`);
    }
    return auditLog;
  }
}
