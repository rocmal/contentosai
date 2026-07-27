import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import {
  CreateAuditLogData,
  IAuditLogsRepository,
  UpdateAuditLogData,
} from '../../domain/repositories/audit-log-repository.interface';
import { AuditLogModel } from './audit-log.model';

@Injectable()
export class AuditLogsRepository
  extends BaseRepository<AuditLogModel, AuditLog, CreateAuditLogData, UpdateAuditLogData>
  implements IAuditLogsRepository
{
  constructor(@InjectModel(AuditLogModel) model: typeof AuditLogModel) {
    super(model);
  }

  protected toEntity(instance: AuditLogModel): AuditLog {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      userId: plain.userId,
      action: plain.action,
      entityType: plain.entityType,
      entityId: plain.entityId,
      changes: plain.changes,
      ipAddress: plain.ipAddress,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
