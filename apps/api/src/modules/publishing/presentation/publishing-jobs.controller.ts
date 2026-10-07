import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PublishingJobsService } from '../application/services/publishing-jobs.service';
import { CreatePublishingJobDto } from '../application/dto/create-publishing-job.dto';
import { UpdatePublishingJobDto } from '../application/dto/update-publishing-job.dto';
import { PublishingJobResponseDto } from '../application/dto/publishing-job-response.dto';

@ApiTags('publishing')
@ApiBearerAuth('access-token')
@Controller({ path: 'publishing/jobs', version: '1' })
export class PublishingJobsController {
  constructor(private readonly publishingJobsService: PublishingJobsService) {}

  @Post()
  @RequirePermissions('publishing.create')
  @ApiOperation({ summary: 'Create a publishing job' })
  async create(
    @Body() dto: CreatePublishingJobDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PublishingJobResponseDto> {
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException('An active organization and workspace are required');
    }
    // Always the caller's own workspace, whatever the request body says.
    const publishingJob = await this.publishingJobsService.create(
      { ...dto, organizationId: user.organizationId, workspaceId: user.workspaceId },
      user.id,
    );
    return new PublishingJobResponseDto(publishingJob);
  }

  @Get()
  @RequirePermissions('publishing.read')
  @ApiOperation({ summary: "List your workspace's publishing jobs" })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    const result = await this.publishingJobsService.listForWorkspace(user, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((publishingJob) => new PublishingJobResponseDto(publishingJob)),
      meta: result.meta,
    };
  }

  @Get('summary')
  @RequirePermissions('publishing.read')
  @ApiOperation({
    summary: 'Exact counts of scheduled, published and failed posts in your workspace',
  })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.publishingJobsService.summarize(user);
  }

  @Get(':id')
  @RequirePermissions('publishing.read')
  @ApiOperation({ summary: 'Get a publishing job by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PublishingJobResponseDto> {
    const publishingJob = await this.publishingJobsService.findForActor(id, user);
    return new PublishingJobResponseDto(publishingJob);
  }

  @Patch(':id')
  @RequirePermissions('publishing.update')
  @ApiOperation({ summary: 'Update a publishing job' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdatePublishingJobDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PublishingJobResponseDto> {
    const publishingJob = await this.publishingJobsService.update(id, dto, user);
    return new PublishingJobResponseDto(publishingJob);
  }

  @Delete(':id')
  @RequirePermissions('publishing.delete')
  @ApiOperation({ summary: 'Delete a publishing job' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    await this.publishingJobsService.remove(id, user);
    return { deleted: true };
  }
}
