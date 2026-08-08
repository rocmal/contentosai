import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '@shared/security/encryption.service';
import { LinkedInApiClient } from '../../infrastructure/linkedin-api.client';
import { IntegrationsService } from './integrations.service';

interface OAuthStatePayload {
  organizationId: string;
  workspaceId: string;
  userId: string;
  iat: number;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Drives the one-time "Connect LinkedIn" OAuth handshake. Same opaque-state
 * pattern as MetaConnectService - see that file for why state is encrypted
 * rather than a session lookup.
 */
@Injectable()
export class LinkedInConnectService {
  constructor(
    private readonly linkedInApiClient: LinkedInApiClient,
    private readonly encryptionService: EncryptionService,
    private readonly integrationsService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return this.configService.get<string>('linkedin.frontendUrl') ?? 'http://localhost:3000';
  }

  buildConnectUrl(user: {
    organizationId: string | null;
    workspaceId: string | null;
    id: string;
  }): string {
    if (!this.linkedInApiClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'LinkedIn publishing is not configured - set LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET/LINKEDIN_REDIRECT_URI',
      );
    }
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException(
        'An active organization and workspace are required to connect LinkedIn',
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
    return this.linkedInApiClient.getLoginDialogUrl(state);
  }

  /** Always resolves to a frontend redirect URL - success and failure alike -
   * since this is called from the browser's top-level navigation, not fetch. */
  async handleCallback(code: string | undefined, state: string | undefined): Promise<string> {
    try {
      if (!code || !state) {
        throw new BadRequestException('Missing code or state from LinkedIn');
      }
      const decoded = this.decodeState(state);
      const member = await this.linkedInApiClient.connectMember(code);

      await this.integrationsService.connect(
        decoded.organizationId,
        decoded.workspaceId,
        'linkedin',
        {
          authorUrn: member.authorUrn,
          memberName: member.memberName,
          accessToken: member.accessToken,
          expiresAt: member.expiresAt,
        },
        decoded.userId,
      );

      return `${this.frontendUrl}/?linkedin_connected=1#integrations`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      return `${this.frontendUrl}/?linkedin_error=${encodeURIComponent(message)}#integrations`;
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
