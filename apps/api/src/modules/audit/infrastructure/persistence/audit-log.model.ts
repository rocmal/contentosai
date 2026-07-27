import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';

@Table({ tableName: 'audit_logs', version: true })
export class AuditLogModel extends BaseModel {
  // No FK constraints on organizationId/userId: this log must never fail to write
  // because a referenced row was hard-deleted.
  @Column({ type: DataType.UUID, allowNull: true })
  declare organizationId: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare userId: string | null;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare action: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare entityType: string;

  @Column({ type: DataType.UUID, allowNull: true })
  declare entityId: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare changes: Record<string, unknown> | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  declare ipAddress: string | null;
}
