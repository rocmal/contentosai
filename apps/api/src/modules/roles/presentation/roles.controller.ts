import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { RolesService } from '../application/services/roles.service';
import { CreateRoleDto } from '../application/dto/create-role.dto';
import { UpdateRoleDto } from '../application/dto/update-role.dto';
import { RoleResponseDto } from '../application/dto/role-response.dto';

@ApiTags('roles')
@ApiBearerAuth('access-token')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a role' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') userId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.create(dto, userId);
    return new RoleResponseDto(role);
  }

  @Get()
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'List roles' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.rolesService.findAll({
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
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') userId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.update(id, dto, userId);
    return new RoleResponseDto(role);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Delete a role' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.rolesService.remove(id, userId);
    return { deleted: true };
  }
}
