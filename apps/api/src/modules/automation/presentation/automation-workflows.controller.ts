import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import {
  assertInWorkspace,
  ownedBy,
  tenantScope,
  workspaceFilters,
} from '@shared/security/tenant-scope';
import { AutomationWorkflowsService } from '../application/services/automation-workflows.service';
import { CreateAutomationWorkflowDto } from '../application/dto/create-automation-workflow.dto';
import { UpdateAutomationWorkflowDto } from '../application/dto/update-automation-workflow.dto';
import { ListAutomationWorkflowsQueryDto } from '../application/dto/list-automation-workflows-query.dto';
import { AutomationWorkflowResponseDto } from '../application/dto/automation-workflow-response.dto';

@ApiTags('automation')
@ApiBearerAuth('access-token')
@Controller({ path: 'automation/workflows', version: '1' })
export class AutomationWorkflowsController {
  constructor(private readonly automationWorkflowsService: AutomationWorkflowsService) {}

  @Post()
  @RequirePermissions('automation.create')
  @ApiOperation({ summary: 'Create an automation workflow' })
  async create(
    @Body() dto: CreateAutomationWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AutomationWorkflowResponseDto> {
    const automationWorkflow = await this.automationWorkflowsService.create(
      ownedBy(dto, tenantScope(user)),
      user.id,
    );
    return new AutomationWorkflowResponseDto(automationWorkflow);
  }

  @Get()
  @RequirePermissions('automation.read')
  @ApiOperation({
    summary: 'List automation workflows (pass organizationId/workspaceId to scope to one tenant)',
  })
  async findAll(
    @Query() query: ListAutomationWorkflowsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const filters: Record<string, string> = {};
    if (query.organizationId) filters.organizationId = query.organizationId;
    if (query.workspaceId) filters.workspaceId = query.workspaceId;

    const result = await this.automationWorkflowsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: workspaceFilters(tenantScope(user), filters),
    });
    return {
      items: result.items.map(
        (automationWorkflow) => new AutomationWorkflowResponseDto(automationWorkflow),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('automation.read')
  @ApiOperation({ summary: 'Get an automation workflow by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AutomationWorkflowResponseDto> {
    const automationWorkflow = assertInWorkspace(
      await this.automationWorkflowsService.findById(id),
      tenantScope(user),
      'Workflow',
    );
    return new AutomationWorkflowResponseDto(automationWorkflow);
  }

  @Patch(':id')
  @RequirePermissions('automation.update')
  @ApiOperation({ summary: 'Update an automation workflow' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AutomationWorkflowResponseDto> {
    assertInWorkspace(
      await this.automationWorkflowsService.findById(id),
      tenantScope(user),
      'Workflow',
    );
    const automationWorkflow = await this.automationWorkflowsService.update(id, dto, user.id);
    return new AutomationWorkflowResponseDto(automationWorkflow);
  }

  @Delete(':id')
  @RequirePermissions('automation.delete')
  @ApiOperation({ summary: 'Delete an automation workflow' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    assertInWorkspace(
      await this.automationWorkflowsService.findById(id),
      tenantScope(user),
      'Workflow',
    );
    await this.automationWorkflowsService.remove(id, user.id);
    return { deleted: true };
  }
}
