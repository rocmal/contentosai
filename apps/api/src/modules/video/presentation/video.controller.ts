import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { VideoService } from '../application/services/video.service';
import { GenerateVideoDto } from '../application/dto/generate-video.dto';
import { JobStatusQueryDto } from '../application/dto/job-status-query.dto';

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

  @Get('jobs/:jobId')
  @RequirePermissions('video.generate')
  @ApiOperation({ summary: 'Check the status of a video generation job' })
  async getJobStatus(@Param('jobId') jobId: string, @Query() query: JobStatusQueryDto) {
    return this.videoService.getJobStatus(query.provider, jobId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available video providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.videoService.listProviders() };
  }
}
