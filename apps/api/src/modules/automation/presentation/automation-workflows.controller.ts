import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
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
    @CurrentUser('id') userId: string,
  ): Promise<AutomationWorkflowResponseDto> {
    const automationWorkflow = await this.automationWorkflowsService.create(dto, userId);
    return new AutomationWorkflowResponseDto(automationWorkflow);
  }

  @Get()
  @RequirePermissions('automation.read')
  @ApiOperation({ summary: 'List automation workflows (pass organizationId/workspaceId to scope to one tenant)' })
  async findAll(@Query() query: ListAutomationWorkflowsQueryDto) {
    const filters: Record<string, string> = {};
    if (query.organizationId) filters.organizationId = query.organizationId;
    if (query.workspaceId) filters.workspaceId = query.workspaceId;

    const result = await this.automationWorkflowsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: Object.keys(filters).length ? filters : undefined,
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
  ): Promise<AutomationWorkflowResponseDto> {
    const automationWorkflow = await this.automationWorkflowsService.findById(id);
    return new AutomationWorkflowResponseDto(automationWorkflow);
  }

  @Patch(':id')
  @RequirePermissions('automation.update')
  @ApiOperation({ summary: 'Update an automation workflow' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowDto,
    @CurrentUser('id') userId: string,
  ): Promise<AutomationWorkflowResponseDto> {
    const automationWorkflow = await this.automationWorkflowsService.update(id, dto, userId);
    return new AutomationWorkflowResponseDto(automationWorkflow);
  }

  @Delete(':id')
  @RequirePermissions('automation.delete')
  @ApiOperation({ summary: 'Delete an automation workflow' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.automationWorkflowsService.remove(id, userId);
    return { deleted: true };
  }
}
