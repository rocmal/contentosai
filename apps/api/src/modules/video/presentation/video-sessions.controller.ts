import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { VideoEditSessionService } from '../application/services/video-edit-session.service';
import { StartVideoSessionDto } from '../application/dto/start-video-session.dto';
import { RefineVideoTurnDto } from '../application/dto/refine-video-turn.dto';
import { VideoEditSessionResponseDto } from '../application/dto/video-edit-session-response.dto';
import { VideoEditTurnResponseDto } from '../application/dto/video-edit-turn-response.dto';

@ApiTags('video-sessions')
@ApiBearerAuth('access-token')
@Controller({ path: 'video/sessions', version: '1' })
export class VideoSessionsController {
  constructor(private readonly sessionService: VideoEditSessionService) {}

  @Post()
  @RequirePermissions('video.generate')
  @ApiOperation({ summary: 'Start a conversational video session from a scene graph' })
  @ApiResponse({ status: 201, type: VideoEditSessionResponseDto })
  @ApiResponse({ status: 422, description: 'Scene exceeds model duration or aspect ratio limits' })
  async start(
    @Body() dto: StartVideoSessionDto,
    @CurrentUser('id') userId: string,
  ): Promise<VideoEditSessionResponseDto> {
    const { session, turns } = await this.sessionService.start(dto, userId);
    return new VideoEditSessionResponseDto(session, turns);
  }

  @Get(':id')
  @RequirePermissions('video.read')
  @ApiOperation({ summary: 'Get a video session with its full turn lineage' })
  @ApiResponse({ status: 200, type: VideoEditSessionResponseDto })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<VideoEditSessionResponseDto> {
    const { session, turns } = await this.sessionService.findOwnedWithTurns(id, userId);
    return new VideoEditSessionResponseDto(session, turns);
  }

  @Post(':id/turns/:turnId/refine')
  @RequirePermissions('video.refine')
  @ApiOperation({
    summary: 'Refine a completed turn, producing a new child turn',
    description:
      'Uses the vendor-side conversation state, so the previous video is not re-uploaded. Only completed, retained turns can be refined.',
  })
  @ApiResponse({ status: 201, type: VideoEditTurnResponseDto })
  @ApiResponse({ status: 404, description: 'Session or turn not found, or not owned by the caller' })
  async refine(
    @Param('id', ParseUuidParamPipe) id: string,
    @Param('turnId', ParseUuidParamPipe) turnId: string,
    @Body() dto: RefineVideoTurnDto,
    @CurrentUser('id') userId: string,
  ): Promise<VideoEditTurnResponseDto> {
    const turn = await this.sessionService.refine(id, turnId, dto, userId);
    return new VideoEditTurnResponseDto(turn);
  }
}
