import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLogModel } from './infrastructure/persistence/audit-log.model';
import { AuditLogsRepository } from './infrastructure/persistence/audit-logs.repository';
import { AUDIT_LOGS_REPOSITORY } from './domain/repositories/audit-log-repository.interface';
import { AuditLogService } from './application/services/audit-log.service';
import { AuditLogListener } from './infrastructure/listeners/audit-log.listener';
import { AuditLogsController } from './presentation/audit-logs.controller';

@Module({
  imports: [SequelizeModule.forFeature([AuditLogModel])],
  controllers: [AuditLogsController],
  providers: [
    AuditLogService,
    AuditLogListener,
    { provide: AUDIT_LOGS_REPOSITORY, useClass: AuditLogsRepository },
  ],
  exports: [AuditLogService, AUDIT_LOGS_REPOSITORY],
})
export class AuditModule {}
