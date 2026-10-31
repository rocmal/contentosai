import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PlatformAdminOnly } from '@common/decorators/platform-admin.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  assertInOrganization,
  organizationFilters,
  tenantScope,
} from '@shared/security/tenant-scope';
import { WorkspacesService } from '../application/services/workspaces.service';
import { CreateWorkspaceDto } from '../application/dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../application/dto/update-workspace.dto';
import { WorkspaceResponseDto } from '../application/dto/workspace-response.dto';

/** A customer sees and edits only their own organization's workspaces. Creating and deleting workspaces is for
 * Lumora's platform admins (signing up creates a customer's workspace). */
@ApiTags('workspaces')
@ApiBearerAuth('access-token')
@Controller({ path: 'workspaces', version: '1' })
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @PlatformAdminOnly()
  @RequirePermissions('workspaces.create')
  @ApiOperation({ summary: 'Create a workspace (platform admins)' })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.workspacesService.create(dto, userId);
    return new WorkspaceResponseDto(workspace);
  }

  @Get()
  @RequirePermissions('workspaces.read')
  @ApiOperation({ summary: "List workspaces (your organization's; every one for platform admins)" })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.workspacesService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: organizationFilters(tenantScope(user)),
    });
    return {
      items: result.items.map((workspace) => new WorkspaceResponseDto(workspace)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('workspaces.read')
  @ApiOperation({ summary: 'Get a workspace by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceResponseDto> {
    const workspace = assertInOrganization(
      await this.workspacesService.findById(id),
      tenantScope(user),
      'Workspace',
    );
    return new WorkspaceResponseDto(workspace);
  }

  @Patch(':id')
  @RequirePermissions('workspaces.update')
  @ApiOperation({ summary: 'Update a workspace' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceResponseDto> {
    assertInOrganization(await this.workspacesService.findById(id), tenantScope(user), 'Workspace');
    const workspace = await this.workspacesService.update(id, dto, user.id);
    return new WorkspaceResponseDto(workspace);
  }

  @Delete(':id')
  @PlatformAdminOnly()
  @RequirePermissions('workspaces.delete')
  @ApiOperation({ summary: 'Delete a workspace (platform admins)' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.remove(id, userId);
    return { deleted: true };
  }
}
