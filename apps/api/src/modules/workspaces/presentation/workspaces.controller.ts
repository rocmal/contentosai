import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { WorkspacesService } from '../application/services/workspaces.service';
import { CreateWorkspaceDto } from '../application/dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../application/dto/update-workspace.dto';
import { WorkspaceResponseDto } from '../application/dto/workspace-response.dto';

@ApiTags('workspaces')
@ApiBearerAuth('access-token')
@Controller({ path: 'workspaces', version: '1' })
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @RequirePermissions('workspaces.create')
  @ApiOperation({ summary: 'Create a workspace' })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspacesService.create(dto, userId);
    return new WorkspaceResponseDto(workspace);
  }

  @Get()
  @RequirePermissions('workspaces.read')
  @ApiOperation({ summary: 'List workspaces' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.workspacesService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((workspace) => new WorkspaceResponseDto(workspace)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('workspaces.read')
  @ApiOperation({ summary: 'Get a workspace by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspacesService.findById(id);
    return new WorkspaceResponseDto(workspace);
  }

  @Patch(':id')
  @RequirePermissions('workspaces.update')
  @ApiOperation({ summary: 'Update a workspace' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspacesService.update(id, dto, userId);
    return new WorkspaceResponseDto(workspace);
  }

  @Delete(':id')
  @RequirePermissions('workspaces.delete')
  @ApiOperation({ summary: 'Delete a workspace' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.remove(id, userId);
    return { deleted: true };
  }
}
