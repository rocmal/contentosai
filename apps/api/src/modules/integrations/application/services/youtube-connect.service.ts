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
  /** The app screen to come back to (see RETURN_VIEWS). */
  returnTo?: string;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/** Screens a connect can return to; anything else returns to Integrations. */
const RETURN_VIEWS = ['integrations', 'youtube-posts'];

export interface YouTubeConnectionCheck {
  connected: boolean;
  /** The stored sign-in still works (Google refreshed it and the channel could be read). */
  working?: boolean;
  channelTitle?: string;
  /** Why it does not work, in words a person can act on. */
  problem?: string;
}

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

  buildConnectUrl(
    user: {
      organizationId: string | null;
      workspaceId: string | null;
      id: string;
    },
    returnTo?: string,
  ): string {
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
        returnTo: returnTo && RETURN_VIEWS.includes(returnTo) ? returnTo : undefined,
      } satisfies OAuthStatePayload),
    );
    return this.youTubeApiClient.getLoginDialogUrl(state);
  }

  /** Always resolves to a frontend redirect URL - success and failure alike -
   * since this is called from the browser's top-level navigation, not fetch. */
  async handleCallback(code: string | undefined, state: string | undefined): Promise<string> {
    let back = 'integrations';
    try {
      if (!code || !state) {
        throw new BadRequestException('Missing code or state from Google');
      }
      const decoded = this.decodeState(state);
      if (decoded.returnTo && RETURN_VIEWS.includes(decoded.returnTo)) back = decoded.returnTo;
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

      return `${this.frontendUrl}/?youtube_connected=1#${back}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      return `${this.frontendUrl}/?youtube_error=${encodeURIComponent(message)}#${back}`;
    }
  }

  /** Whether the workspace's stored YouTube sign-in still works - the YouTube page shows this before anyone posts. */
  async check(workspaceId: string): Promise<YouTubeConnectionCheck> {
    const credentials = await this.integrationsService.getDecryptedCredentials(
      workspaceId,
      'youtube',
    );
    const refreshToken = credentials?.refreshToken;
    if (typeof refreshToken !== 'string' || !refreshToken) return { connected: false };
    const storedTitle =
      typeof credentials?.channelTitle === 'string' ? credentials.channelTitle : undefined;
    if (!this.youTubeApiClient.hasGoogleClient()) {
      return {
        connected: true,
        working: false,
        channelTitle: storedTitle,
        problem:
          'YouTube is not set up on this server yet (the Google client is missing). Once it is, reconnect YouTube.',
      };
    }
    try {
      const { channelTitle } = await this.youTubeApiClient.checkChannel(refreshToken);
      return { connected: true, working: true, channelTitle: channelTitle ?? storedTitle };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        connected: true,
        working: false,
        channelTitle: storedTitle,
        problem: /invalid_grant|invalid_client|unauthorized_client/i.test(message)
          ? 'The YouTube sign-in has expired or was removed. Reconnect YouTube.'
          : `Google could not confirm the connection: ${message}`,
      };
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
