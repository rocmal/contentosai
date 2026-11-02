import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import {
  CreateAuditLogData,
  IAuditLogsRepository,
  ListRecentAuditLogsOptions,
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

  async listRecent(options: ListRecentAuditLogsOptions): Promise<AuditLog[]> {
    const where: WhereOptions = {
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
      ...(options.actionPrefix ? { action: { [Op.startsWith]: options.actionPrefix } } : {}),
    };
    const rows = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit,
    });
    return rows.map((row) => this.toEntity(row));
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
