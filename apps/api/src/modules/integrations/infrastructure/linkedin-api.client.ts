import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LinkedInErrorResponse {
  error?: string;
  error_description?: string;
  message?: string;
}

interface AccessTokenResponse extends LinkedInErrorResponse {
  access_token?: string;
  expires_in?: number;
}

interface UserInfoResponse extends LinkedInErrorResponse {
  sub?: string;
  name?: string;
}

export interface ConnectedLinkedInMember {
  authorUrn: string;
  memberName?: string;
  accessToken: string;
  expiresAt: number;
}

const OAUTH_SCOPES = ['openid', 'profile', 'w_member_social'].join(' ');

/**
 * Thin wrapper around LinkedIn's OAuth + OpenID userinfo endpoints. Posts as
 * the connected member (w_member_social) - true Company Page posting needs
 * LinkedIn's Community Management API partner approval, out of scope for v1.
 */
@Injectable()
export class LinkedInApiClient {
  constructor(private readonly configService: ConfigService) {}

  private get clientId(): string {
    return this.configService.get<string>('linkedin.clientId') ?? '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('linkedin.clientSecret') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('linkedin.redirectUri') ?? '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  getLoginDialogUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: OAUTH_SCOPES,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async connectMember(code: string): Promise<ConnectedLinkedInMember> {
    const accessToken = await this.exchangeCodeForToken(code);
    const userInfo = await this.fetchUserInfo(accessToken.access_token);
    return {
      authorUrn: `urn:li:person:${userInfo.sub}`,
      memberName: userInfo.name,
      accessToken: accessToken.access_token,
      expiresAt: Date.now() + (accessToken.expires_in ?? 0) * 1000,
    };
  }

  private async exchangeCodeForToken(
    code: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const body = (await response.json()) as AccessTokenResponse;
    if (!response.ok || !body.access_token) {
      throw new ServiceUnavailableException(
        `LinkedIn token exchange failed: ${body.error_description ?? body.error ?? response.statusText}`,
      );
    }
    return { access_token: body.access_token, expires_in: body.expires_in };
  }

  private async fetchUserInfo(accessToken: string): Promise<UserInfoResponse> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json()) as UserInfoResponse;
    if (!response.ok || !body.sub) {
      throw new ServiceUnavailableException(
        `Fetching LinkedIn profile failed: ${body.message ?? response.statusText}`,
      );
    }
    return body;
  }
}
