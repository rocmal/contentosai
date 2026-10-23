import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import {
  YouTubeConnectionCheck,
  YouTubeConnectService,
} from '../application/services/youtube-connect.service';
import { IntegrationsService } from '../application/services/integrations.service';

@ApiTags('integrations')
@Controller({ path: 'integrations/youtube', version: '1' })
export class YouTubeConnectController {
  constructor(
    private readonly youTubeConnectService: YouTubeConnectService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get('connect')
  @ApiBearerAuth('access-token')
  @RequirePermissions('integrations.create')
  @ApiOperation({ summary: 'Get the YouTube (Google) OAuth connect URL for the current workspace' })
  connect(
    @CurrentUser() user: AuthenticatedUser,
    @Query('returnTo') returnTo?: string,
  ): { url: string } {
    return { url: this.youTubeConnectService.buildConnectUrl(user, returnTo) };
  }

  @Get('check')
  @ApiBearerAuth('access-token')
  @RequirePermissions('integrations.read')
  @ApiOperation({
    summary:
      "Whether the workspace's stored YouTube sign-in still works (Google is asked; nothing is posted)",
  })
  check(@CurrentUser('workspaceId') workspaceId: string): Promise<YouTubeConnectionCheck> {
    return this.youTubeConnectService.check(workspaceId);
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: "Google's OAuth redirect target - called by Google, not the frontend" })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.youTubeConnectService.handleCallback(code, state);
    res.redirect(redirectUrl);
  }

  @Get('status')
  @ApiBearerAuth('access-token')
  @RequirePermissions('integrations.read')
  @ApiOperation({ summary: 'YouTube connection status for the current workspace' })
  async status(@CurrentUser('workspaceId') workspaceId: string) {
    return this.integrationsService.getConnectionStatus(workspaceId);
  }
}
