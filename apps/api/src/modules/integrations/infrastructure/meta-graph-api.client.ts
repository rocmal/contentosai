import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GraphErrorResponse {
  error?: { message: string; type?: string; code?: number };
}

interface AccessTokenResponse extends GraphErrorResponse {
  access_token?: string;
  expires_in?: number;
}

interface InstagramBusinessAccount {
  id: string;
  username?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: InstagramBusinessAccount;
}

interface PagesResponse extends GraphErrorResponse {
  data?: FacebookPage[];
}

export interface ConnectedPage {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId?: string;
  igUsername?: string;
}

const OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',');

/**
 * Thin wrapper around Meta's Graph API OAuth + Pages endpoints. Only used
 * during the one-time "Connect Facebook/Instagram" flow - actual post
 * publishing goes through ISocialPublisher, not this client.
 */
@Injectable()
export class MetaGraphApiClient {
  constructor(private readonly configService: ConfigService) {}

  private get appId(): string {
    return this.configService.get<string>('meta.appId') ?? '';
  }

  private get appSecret(): string {
    return this.configService.get<string>('meta.appSecret') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('meta.redirectUri') ?? '';
  }

  private get graphBaseUrl(): string {
    const version = this.configService.get<string>('meta.graphApiVersion') ?? 'v21.0';
    return `https://graph.facebook.com/${version}`;
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret && this.redirectUri);
  }

  getLoginDialogUrl(state: string): string {
    const version = this.configService.get<string>('meta.graphApiVersion') ?? 'v21.0';
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope: OAUTH_SCOPES,
      response_type: 'code',
    });
    return `https://www.facebook.com/${version}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForLongLivedToken(code: string): Promise<string> {
    const shortLivedToken = await this.exchangeCodeForToken(code);
    return this.exchangeForLongLivedToken(shortLivedToken);
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: this.redirectUri,
      code,
    });
    const response = await fetch(`${this.graphBaseUrl}/oauth/access_token?${params.toString()}`);
    const body = (await response.json()) as AccessTokenResponse;
    if (!response.ok || !body.access_token) {
      throw new ServiceUnavailableException(
        `Meta token exchange failed: ${body.error?.message ?? response.statusText}`,
      );
    }
    return body.access_token;
  }

  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken,
    });
    const response = await fetch(`${this.graphBaseUrl}/oauth/access_token?${params.toString()}`);
    const body = (await response.json()) as AccessTokenResponse;
    if (!response.ok || !body.access_token) {
      throw new ServiceUnavailableException(
        `Meta long-lived token exchange failed: ${body.error?.message ?? response.statusText}`,
      );
    }
    return body.access_token;
  }

  /** Pages the authorizing user manages, each carrying its own page access
   * token and (if linked) the Instagram Business account used for publishing. */
  async listConnectedPages(longLivedUserToken: string): Promise<ConnectedPage[]> {
    const params = new URLSearchParams({
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      access_token: longLivedUserToken,
    });
    const response = await fetch(`${this.graphBaseUrl}/me/accounts?${params.toString()}`);
    const body = (await response.json()) as PagesResponse;
    if (!response.ok || !body.data) {
      throw new ServiceUnavailableException(
        `Fetching Facebook Pages failed: ${body.error?.message ?? response.statusText}`,
      );
    }

    return body.data.map((page) => ({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      igUserId: page.instagram_business_account?.id,
      igUsername: page.instagram_business_account?.username,
    }));
  }
}
