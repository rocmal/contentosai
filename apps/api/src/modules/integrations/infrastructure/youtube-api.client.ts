import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auth, youtube } from '@googleapis/youtube';

type OAuth2Client = InstanceType<typeof auth.OAuth2>;

export interface ConnectedYouTubeChannel {
  channelId: string;
  channelTitle?: string;
  refreshToken: string;
}

const UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

/**
 * Thin wrapper around Google's OAuth + YouTube Data API v3, reusing the same
 * Google Cloud OAuth client as login but with its own redirect URI/scope
 * (see youtube.config.ts). offline access + prompt=consent are required to
 * get a refresh token, since publishing jobs run unattended in the worker.
 */
@Injectable()
export class YouTubeApiClient {
  constructor(private readonly configService: ConfigService) {}

  private get clientId(): string {
    return this.configService.get<string>('youtube.clientId') ?? '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('youtube.clientSecret') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('youtube.redirectUri') ?? '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  private buildOAuthClient(): OAuth2Client {
    return new auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  getLoginDialogUrl(state: string): string {
    const oauth2Client = this.buildOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [UPLOAD_SCOPE, READONLY_SCOPE],
      state,
    });
  }

  async connectChannel(code: string): Promise<ConnectedYouTubeChannel> {
    const oauth2Client = this.buildOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new ServiceUnavailableException(
        'Google did not return a refresh token - revoke prior access at myaccount.google.com/permissions and reconnect',
      );
    }
    oauth2Client.setCredentials(tokens);

    const youtubeClient = youtube({ version: 'v3', auth: oauth2Client });
    const channels = await youtubeClient.channels.list({ part: ['snippet'], mine: true });
    const channel = channels.data.items?.[0];
    if (!channel?.id) {
      throw new ServiceUnavailableException('No YouTube channel found for this Google account');
    }

    return {
      channelId: channel.id,
      channelTitle: channel.snippet?.title ?? undefined,
      refreshToken: tokens.refresh_token,
    };
  }
}
