import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { VideoService } from '../application/services/video.service';
import { GenerateVideoDto } from '../application/dto/generate-video.dto';
import { JobStatusByIdQueryDto, JobStatusQueryDto } from '../application/dto/job-status-query.dto';
import { ChargeSceneVideoDto } from '../application/dto/charge-scene-video.dto';

@ApiTags('video')
@ApiBearerAuth('access-token')
@Controller({ path: 'video', version: '1' })
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('generate')
  @RequirePermissions('video.generate')
  @ApiOperation({ summary: 'Submit a video generation job to the selected provider' })
  async generate(
    @Body() dto: GenerateVideoDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('workspaceId') workspaceId: string | null,
  ) {
    return this.videoService.submitJob(dto, { userId, organizationId, workspaceId });
  }

  @Post('scene-builder/charge')
  @RequirePermissions('video.generate')
  @ApiOperation({
    summary:
      'Charge a Scene Builder video (made in the browser) before it is shown; 402 when credits run short',
  })
  chargeSceneVideo(
    @Body() dto: ChargeSceneVideoDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('workspaceId') workspaceId: string | null,
  ): Promise<{ creditsCharged: number }> {
    return this.videoService.chargeSceneVideo({
      userId,
      organizationId,
      workspaceId,
      projectId: dto.projectId,
    });
  }

  // Declared before 'jobs/:jobId' so "status" is not taken for a job id.
  @Get('jobs/status')
  @RequirePermissions('video.generate')
  @ApiOperation({
    summary:
      'Check the status of a video generation job (job id in the query; ids may contain slashes)',
  })
  async getJobStatusByQuery(
    @Query() query: JobStatusByIdQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('workspaceId') workspaceId: string | null,
  ) {
    return this.videoService.getJobStatus(query.provider, query.jobId, {
      userId,
      organizationId,
      workspaceId,
      cacheKey: query.cacheKey,
    });
  }

  /** Kept for older phone builds; ids with slashes (Veo) do not reach it through the live server - use jobs/status. */
  @Get('jobs/:jobId')
  @RequirePermissions('video.generate')
  @ApiOperation({ summary: 'Check the status of a video generation job' })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Query() query: JobStatusQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('workspaceId') workspaceId: string | null,
  ) {
    return this.videoService.getJobStatus(query.provider, jobId, {
      userId,
      organizationId,
      workspaceId,
      cacheKey: query.cacheKey,
    });
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available video providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.videoService.listProviders() };
  }
}
