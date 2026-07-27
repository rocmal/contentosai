import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AuditLogService } from '../application/services/audit-log.service';
import { AuditLogResponseDto } from '../application/dto/audit-log-response.dto';

// Read-only: writes only happen internally via AuditLogService.record().
@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'List audit log entries' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.auditLogService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((auditLog) => new AuditLogResponseDto(auditLog)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'Get an audit log entry by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<AuditLogResponseDto> {
    const auditLog = await this.auditLogService.findById(id);
    return new AuditLogResponseDto(auditLog);
  }
}
