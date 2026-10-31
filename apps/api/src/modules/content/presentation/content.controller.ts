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
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ContentService } from '../application/services/content.service';
import { CreateContentDto } from '../application/dto/create-content.dto';
import { UpdateContentDto } from '../application/dto/update-content.dto';
import { ContentResponseDto } from '../application/dto/content-response.dto';

@ApiTags('content')
@ApiBearerAuth('access-token')
@Controller({ path: 'content', version: '1' })
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @RequirePermissions('content.create')
  @ApiOperation({ summary: 'Create a content item' })
  async create(
    @Body() dto: CreateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentResponseDto> {
    const content = await this.contentService.create(ownedBy(dto, tenantScope(user)), user.id);
    return new ContentResponseDto(content);
  }

  @Get()
  @RequirePermissions('content.read')
  @ApiOperation({ summary: 'List content items' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId') projectId?: string,
  ) {
    const result = await this.contentService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: workspaceFilters(tenantScope(user), projectId ? { projectId } : {}),
    });
    return {
      items: result.items.map((content) => new ContentResponseDto(content)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('content.read')
  @ApiOperation({ summary: 'Get a content item by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentResponseDto> {
    const content = assertInWorkspace(
      await this.contentService.findById(id),
      tenantScope(user),
      'Content',
    );
    return new ContentResponseDto(content);
  }

  @Patch(':id')
  @RequirePermissions('content.update')
  @ApiOperation({ summary: 'Update a content item' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentResponseDto> {
    assertInWorkspace(await this.contentService.findById(id), tenantScope(user), 'Content');
    const content = await this.contentService.update(id, dto, user.id);
    return new ContentResponseDto(content);
  }

  @Delete(':id')
  @RequirePermissions('content.delete')
  @ApiOperation({ summary: 'Delete a content item' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    assertInWorkspace(await this.contentService.findById(id), tenantScope(user), 'Content');
    await this.contentService.remove(id, user.id);
    return { deleted: true };
  }
}
