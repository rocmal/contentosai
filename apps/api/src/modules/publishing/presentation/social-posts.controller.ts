import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { CreateSocialPostDto } from '../application/dto/create-social-post.dto';
import { PublishingJobResponseDto } from '../application/dto/publishing-job-response.dto';
import { SocialPostsService } from '../application/services/social-posts.service';

@ApiTags('publishing')
@ApiBearerAuth('access-token')
@Controller({ path: 'publishing/posts', version: '1' })
export class SocialPostsController {
  constructor(private readonly socialPostsService: SocialPostsService) {}

  @Post()
  @RequirePermissions('publishing.create')
  @ApiOperation({
    summary:
      'Post now or schedule: text, optionally a Gallery image or video, to one or more connected accounts',
  })
  async create(
    @Body() dto: CreateSocialPostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ contentId: string; jobs: PublishingJobResponseDto[] }> {
    const created = await this.socialPostsService.create(dto, user);
    return {
      contentId: created.contentId,
      jobs: created.jobs.map((job) => new PublishingJobResponseDto(job)),
    };
  }
}
