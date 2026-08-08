import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { LinkedInConnectService } from '../application/services/linkedin-connect.service';
import { IntegrationsService } from '../application/services/integrations.service';

@ApiTags('integrations')
@Controller({ path: 'integrations/linkedin', version: '1' })
export class LinkedInConnectController {
  constructor(
    private readonly linkedInConnectService: LinkedInConnectService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get('connect')
  @ApiBearerAuth('access-token')
  @RequirePermissions('integrations.create')
  @ApiOperation({ summary: 'Get the LinkedIn OAuth connect URL for the current workspace' })
  connect(@CurrentUser() user: AuthenticatedUser): { url: string } {
    return { url: this.linkedInConnectService.buildConnectUrl(user) };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: "LinkedIn's OAuth redirect target - called by LinkedIn, not the frontend" })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.linkedInConnectService.handleCallback(code, state);
    res.redirect(redirectUrl);
  }

  @Get('status')
  @ApiBearerAuth('access-token')
  @RequirePermissions('integrations.read')
  @ApiOperation({ summary: 'LinkedIn connection status for the current workspace' })
  async status(@CurrentUser('workspaceId') workspaceId: string) {
    return this.integrationsService.getConnectionStatus(workspaceId);
  }
}
