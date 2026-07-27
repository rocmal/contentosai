import { ApiProperty } from '@nestjs/swagger';
import { AuditLog } from '../../domain/entities/audit-log.entity';

export class AuditLogResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) organizationId: string | null;
  @ApiProperty({ nullable: true }) userId: string | null;
  @ApiProperty() action: string;
  @ApiProperty() entityType: string;
  @ApiProperty({ nullable: true }) entityId: string | null;
  @ApiProperty({ nullable: true, type: Object }) changes: Record<string, unknown> | null;
  @ApiProperty({ nullable: true }) ipAddress: string | null;
  @ApiProperty() createdAt: Date;

  constructor(auditLog: AuditLog) {
    this.id = auditLog.id;
    this.organizationId = auditLog.organizationId;
    this.userId = auditLog.userId;
    this.action = auditLog.action;
    this.entityType = auditLog.entityType;
    this.entityId = auditLog.entityId;
    this.changes = auditLog.changes;
    this.ipAddress = auditLog.ipAddress;
    this.createdAt = auditLog.createdAt;
  }
}
