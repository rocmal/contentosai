import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '@shared/security/encryption.service';
import { YouTubeApiClient } from '../../infrastructure/youtube-api.client';
import { IntegrationsService } from './integrations.service';

interface OAuthStatePayload {
  organizationId: string;
  workspaceId: string;
  userId: string;
  iat: number;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Drives the one-time "Connect YouTube" OAuth handshake. Same opaque-state
 * pattern as MetaConnectService/LinkedInConnectService.
 */
@Injectable()
export class YouTubeConnectService {
  constructor(
    private readonly youTubeApiClient: YouTubeApiClient,
    private readonly encryptionService: EncryptionService,
    private readonly integrationsService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return this.configService.get<string>('youtube.frontendUrl') ?? 'http://localhost:3000';
  }

  buildConnectUrl(user: {
    organizationId: string | null;
    workspaceId: string | null;
    id: string;
  }): string {
    if (!this.youTubeApiClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'YouTube publishing is not configured - set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/YOUTUBE_REDIRECT_URI',
      );
    }
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException(
        'An active organization and workspace are required to connect YouTube',
      );
    }

    const state = this.encryptionService.encrypt(
      JSON.stringify({
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        userId: user.id,
        iat: Date.now(),
      } satisfies OAuthStatePayload),
    );
    return this.youTubeApiClient.getLoginDialogUrl(state);
  }

  /** Always resolves to a frontend redirect URL - success and failure alike -
   * since this is called from the browser's top-level navigation, not fetch. */
  async handleCallback(code: string | undefined, state: string | undefined): Promise<string> {
    try {
      if (!code || !state) {
        throw new BadRequestException('Missing code or state from Google');
      }
      const decoded = this.decodeState(state);
      const channel = await this.youTubeApiClient.connectChannel(code);

      await this.integrationsService.connect(
        decoded.organizationId,
        decoded.workspaceId,
        'youtube',
        {
          channelId: channel.channelId,
          channelTitle: channel.channelTitle,
          refreshToken: channel.refreshToken,
        },
        decoded.userId,
      );

      return `${this.frontendUrl}/?youtube_connected=1#integrations`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      return `${this.frontendUrl}/?youtube_error=${encodeURIComponent(message)}#integrations`;
    }
  }

  private decodeState(state: string): OAuthStatePayload {
    let decoded: OAuthStatePayload;
    try {
      decoded = JSON.parse(this.encryptionService.decrypt(state)) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid or tampered OAuth state');
    }
    if (Date.now() - decoded.iat > STATE_MAX_AGE_MS) {
      throw new BadRequestException('OAuth state expired - please reconnect');
    }
    return decoded;
  }
}
