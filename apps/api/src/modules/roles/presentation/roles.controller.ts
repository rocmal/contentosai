import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { RolesService } from '../application/services/roles.service';
import { CreateRoleDto } from '../application/dto/create-role.dto';
import { UpdateRoleDto } from '../application/dto/update-role.dto';
import { RoleResponseDto } from '../application/dto/role-response.dto';

function requireOrganizationId(organizationId: string | null): string {
  if (!organizationId) {
    throw new BadRequestException('Your account is not attached to an organization yet.');
  }
  return organizationId;
}

@ApiTags('roles')
@ApiBearerAuth('access-token')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: "Create a custom role for the caller's organization" })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('id') userId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.create(dto, requireOrganizationId(organizationId), userId);
    return new RoleResponseDto(role);
  }

  @Get()
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: "List roles available to the caller's organization (system roles + their own custom ones)" })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser('organizationId') organizationId: string | null,
  ) {
    const result = await this.rolesService.findAllForOrganization(requireOrganizationId(organizationId), {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((role) => new RoleResponseDto(role)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get a role by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<RoleResponseDto> {
    const role = await this.rolesService.findById(id);
    return new RoleResponseDto(role);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: "Update one of the caller's organization's own custom roles" })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('id') userId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.update(id, dto, requireOrganizationId(organizationId), userId);
    return new RoleResponseDto(role);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: "Delete one of the caller's organization's own custom roles" })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.rolesService.remove(id, requireOrganizationId(organizationId), userId);
    return { deleted: true };
  }
}
