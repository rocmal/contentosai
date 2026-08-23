import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { VideoProjectsService } from '../application/services/video-projects.service';
import { CreateVideoProjectDto } from '../application/dto/create-video-project.dto';
import { UpdateVideoProjectDto } from '../application/dto/update-video-project.dto';
import { FinishVideoProjectDto } from '../application/dto/finish-video-project.dto';
import { VideoProjectResponseDto } from '../application/dto/video-project-response.dto';

@ApiTags('video-projects')
@ApiBearerAuth('access-token')
@Controller({ path: 'video-projects', version: '1' })
export class VideoProjectsController {
  constructor(private readonly videoProjectsService: VideoProjectsService) {}

  @Post()
  @RequirePermissions('video-projects.create')
  @ApiOperation({ summary: 'Start a new Scene Builder project (an empty draft, or from existing scenes)' })
  async create(
    @Body() dto: CreateVideoProjectDto,
    @CurrentUser('id') userId: string,
  ): Promise<VideoProjectResponseDto> {
    const project = await this.videoProjectsService.create(dto, userId);
    return new VideoProjectResponseDto(project);
  }

  @Get()
  @RequirePermissions('video-projects.read')
  @ApiOperation({
    summary:
      "List your own video projects, most-recently-edited first - items[0] is 'Continue editing' if it's still a draft, the rest are past projects",
  })
  async findMine(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    if (!user.workspaceId) {
      return { items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: query.limit, totalPages: 0, currentPage: query.page } };
    }
    const result = await this.videoProjectsService.findMine(user.workspaceId, user.id, {
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items.map((project) => new VideoProjectResponseDto(project)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('video-projects.read')
  @ApiOperation({ summary: 'Get one of your video projects, to resume editing it' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<VideoProjectResponseDto> {
    const project = await this.videoProjectsService.findOwned(id, userId);
    return new VideoProjectResponseDto(project);
  }

  @Patch(':id')
  @RequirePermissions('video-projects.update')
  @ApiOperation({ summary: 'Auto-save target - patch title/scenes/narration settings as they change' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateVideoProjectDto,
    @CurrentUser('id') userId: string,
  ): Promise<VideoProjectResponseDto> {
    const project = await this.videoProjectsService.update(id, dto, userId);
    return new VideoProjectResponseDto(project);
  }

  @Patch(':id/finish')
  @RequirePermissions('video-projects.update')
  @ApiOperation({ summary: 'Mark ready and attach the MediaAsset the composited export was saved as' })
  async finish(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: FinishVideoProjectDto,
    @CurrentUser('id') userId: string,
  ): Promise<VideoProjectResponseDto> {
    const project = await this.videoProjectsService.finish(id, dto.finalAssetId, userId);
    return new VideoProjectResponseDto(project);
  }

  @Delete(':id')
  @RequirePermissions('video-projects.delete')
  @ApiOperation({ summary: 'Delete one of your video projects' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.videoProjectsService.remove(id, userId);
    return { deleted: true };
  }
}
