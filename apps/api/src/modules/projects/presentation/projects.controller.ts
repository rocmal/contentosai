import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ProjectsService } from '../application/services/projects.service';
import { CreateProjectDto } from '../application/dto/create-project.dto';
import { UpdateProjectDto } from '../application/dto/update-project.dto';
import { ProjectResponseDto } from '../application/dto/project-response.dto';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('projects.create')
  @ApiOperation({ summary: 'Create a project' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(dto, userId);
    return new ProjectResponseDto(project);
  }

  @Get()
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'List projects' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.projectsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((project) => new ProjectResponseDto(project)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'Get a project by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<ProjectResponseDto> {
    const project = await this.projectsService.findById(id);
    return new ProjectResponseDto(project);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') userId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(id, dto, userId);
    return new ProjectResponseDto(project);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  @ApiOperation({ summary: 'Delete a project' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.projectsService.remove(id, userId);
    return { deleted: true };
  }
}
