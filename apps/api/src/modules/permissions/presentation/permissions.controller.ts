import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PermissionsService } from '../application/services/permissions.service';
import { CreatePermissionDto } from '../application/dto/create-permission.dto';
import { UpdatePermissionDto } from '../application/dto/update-permission.dto';
import { PermissionResponseDto } from '../application/dto/permission-response.dto';

@ApiTags('permissions')
@ApiBearerAuth('access-token')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions('permissions.create')
  @ApiOperation({ summary: 'Create a permission' })
  async create(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('id') userId: string,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionsService.create(dto, userId);
    return new PermissionResponseDto(permission);
  }

  @Get()
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'List permissions' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.permissionsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((permission) => new PermissionResponseDto(permission)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Get a permission by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionsService.findById(id);
    return new PermissionResponseDto(permission);
  }

  @Patch(':id')
  @RequirePermissions('permissions.update')
  @ApiOperation({ summary: 'Update a permission' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser('id') userId: string,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionsService.update(id, dto, userId);
    return new PermissionResponseDto(permission);
  }

  @Delete(':id')
  @RequirePermissions('permissions.delete')
  @ApiOperation({ summary: 'Delete a permission' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.permissionsService.remove(id, userId);
    return { deleted: true };
  }
}
