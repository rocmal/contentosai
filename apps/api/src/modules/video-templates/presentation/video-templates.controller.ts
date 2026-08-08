import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { VideoTemplatesService } from '../application/services/video-templates.service';
import { CreateVideoTemplateDto } from '../application/dto/create-video-template.dto';
import { VideoTemplateResponseDto } from '../application/dto/video-template-response.dto';

@ApiTags('video-templates')
@ApiBearerAuth('access-token')
@Controller({ path: 'video-templates', version: '1' })
export class VideoTemplatesController {
  constructor(private readonly videoTemplatesService: VideoTemplatesService) {}

  @Post()
  @RequirePermissions('video-templates.create')
  @ApiOperation({
    summary: 'Save a video as a reusable template (private to you, or shared with your team)',
  })
  async create(
    @Body() dto: CreateVideoTemplateDto,
    @CurrentUser('id') userId: string,
  ): Promise<VideoTemplateResponseDto> {
    const videoTemplate = await this.videoTemplatesService.create(dto, userId);
    return new VideoTemplateResponseDto(videoTemplate);
  }

  @Get()
  @RequirePermissions('video-templates.read')
  @ApiOperation({
    summary: 'List templates available to you - your own + everything shared with your team',
  })
  async findAvailable(@CurrentUser() user: AuthenticatedUser) {
    if (!user.workspaceId) {
      return { items: [] };
    }
    const templates = await this.videoTemplatesService.findAvailableForUser(
      user.workspaceId,
      user.id,
    );
    return { items: templates.map((template) => new VideoTemplateResponseDto(template)) };
  }

  @Delete(':id')
  @RequirePermissions('video-templates.delete')
  @ApiOperation({ summary: 'Delete a template you created' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.videoTemplatesService.remove(id, userId);
    return { deleted: true };
  }
}
