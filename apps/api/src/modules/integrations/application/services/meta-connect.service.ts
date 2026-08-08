import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '@shared/security/encryption.service';
import { MetaGraphApiClient } from '../../infrastructure/meta-graph-api.client';
import { IntegrationsService } from './integrations.service';

interface OAuthStatePayload {
  organizationId: string;
  workspaceId: string;
  userId: string;
  iat: number;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Drives the one-time "Connect Facebook/Instagram" OAuth handshake. The
 * `state` param carries the initiating user's org/workspace through Meta's
 * redirect (there's no session to rely on when Meta calls the public
 * callback) - it's opaque ciphertext via the same EncryptionService used for
 * integration credentials at rest, so it can't be read or tampered with.
 */
@Injectable()
export class MetaConnectService {
  constructor(
    private readonly metaGraphApiClient: MetaGraphApiClient,
    private readonly encryptionService: EncryptionService,
    private readonly integrationsService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return this.configService.get<string>('meta.frontendUrl') ?? 'http://localhost:3000';
  }

  buildConnectUrl(user: {
    organizationId: string | null;
    workspaceId: string | null;
    id: string;
  }): string {
    if (!this.metaGraphApiClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'Meta publishing is not configured - set META_APP_ID/META_APP_SECRET/META_REDIRECT_URI',
      );
    }
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException(
        'An active organization and workspace are required to connect Meta',
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
    return this.metaGraphApiClient.getLoginDialogUrl(state);
  }

  /** Always resolves to a frontend redirect URL - success and failure alike -
   * since this is called from the browser's top-level navigation, not fetch. */
  async handleCallback(code: string | undefined, state: string | undefined): Promise<string> {
    try {
      if (!code || !state) {
        throw new BadRequestException('Missing code or state from Meta');
      }
      const decoded = this.decodeState(state);
      const longLivedToken = await this.metaGraphApiClient.exchangeCodeForLongLivedToken(code);
      const pages = await this.metaGraphApiClient.listConnectedPages(longLivedToken);

      if (pages.length === 0) {
        return `${this.frontendUrl}/?meta_error=no_pages_found#integrations`;
      }

      const page = pages.find((candidate) => candidate.igUserId) ?? pages[0];

      await this.integrationsService.connect(
        decoded.organizationId,
        decoded.workspaceId,
        'facebook',
        { pageId: page.pageId, pageName: page.pageName, pageAccessToken: page.pageAccessToken },
        decoded.userId,
      );

      if (page.igUserId) {
        await this.integrationsService.connect(
          decoded.organizationId,
          decoded.workspaceId,
          'instagram',
          {
            pageId: page.pageId,
            igUserId: page.igUserId,
            igUsername: page.igUsername,
            pageAccessToken: page.pageAccessToken,
          },
          decoded.userId,
        );
      }

      return `${this.frontendUrl}/?meta_connected=1#integrations`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      return `${this.frontendUrl}/?meta_error=${encodeURIComponent(message)}#integrations`;
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
