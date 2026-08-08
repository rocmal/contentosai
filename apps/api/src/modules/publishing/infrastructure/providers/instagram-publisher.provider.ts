import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISocialPublisher,
  SocialPublishRequest,
  SocialPublishResult,
} from '../../domain/interfaces/social-publisher.interface';

interface GraphErrorResponse {
  error?: { message: string; type?: string; code?: number };
}

interface CreateContainerResponse extends GraphErrorResponse {
  id?: string;
}

interface ContainerStatusResponse extends GraphErrorResponse {
  status_code?: 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED';
}

interface PublishContainerResponse extends GraphErrorResponse {
  id?: string;
}

interface MediaPermalinkResponse extends GraphErrorResponse {
  permalink?: string;
}

const MAX_POLL_ATTEMPTS = 20;
const POLL_DELAY_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Instagram publishing is a 3-step Graph API dance: create a media
 * "container" that points at the video URL, poll until Instagram's servers
 * finish downloading/transcoding it, then publish the finished container.
 * The video must be reachable by Instagram's servers over plain HTTPS -
 * localhost URLs will not work (see StorageProviderFactory/S3/MinIO docs).
 */
@Injectable()
export class InstagramPublisherProvider implements ISocialPublisher {
  readonly name = 'instagram';

  constructor(private readonly configService: ConfigService) {}

  private get graphBaseUrl(): string {
    const version = this.configService.get<string>('meta.graphApiVersion') ?? 'v21.0';
    return `https://graph.facebook.com/${version}`;
  }

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    const igUserId = request.credentials.igUserId as string | undefined;
    const pageAccessToken = request.credentials.pageAccessToken as string;
    if (!igUserId) {
      throw new BadRequestException(
        'An Instagram Business account must be connected to publish this video',
      );
    }
    if (!request.videoUrl) {
      throw new BadRequestException('A video is required to publish to Instagram');
    }

    const containerId = await this.createContainer(request, igUserId, pageAccessToken);
    await this.waitUntilReady(containerId, pageAccessToken);
    const mediaId = await this.publishContainer(igUserId, containerId, pageAccessToken);

    return {
      externalPostId: mediaId,
      permalink: await this.fetchPermalink(mediaId, pageAccessToken),
    };
  }

  /** Instagram's real post URLs use a base62-encoded shortcode, not the raw
   * numeric media id - Meta is the only reliable source for that mapping,
   * so ask for it rather than guess a URL shape. Falls back to undefined
   * (no link shown) if this one extra call fails; the publish itself still
   * succeeded and shouldn't be treated as a failure over a missing link. */
  private async fetchPermalink(mediaId: string, accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.graphBaseUrl}/${mediaId}?fields=permalink&access_token=${accessToken}`,
      );
      const body = (await response.json()) as MediaPermalinkResponse;
      return response.ok ? body.permalink : undefined;
    } catch {
      return undefined;
    }
  }

  private async createContainer(
    request: SocialPublishRequest,
    igUserId: string,
    pageAccessToken: string,
  ): Promise<string> {
    const response = await fetch(`${this.graphBaseUrl}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: request.videoUrl,
        caption: request.caption,
        access_token: pageAccessToken,
      }),
    });

    const body = (await response.json()) as CreateContainerResponse;
    if (!response.ok || !body.id) {
      throw new ServiceUnavailableException(
        `Instagram media container creation failed: ${body.error?.message ?? response.statusText}`,
      );
    }
    return body.id;
  }

  private async waitUntilReady(containerId: string, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const response = await fetch(
        `${this.graphBaseUrl}/${containerId}?fields=status_code&access_token=${accessToken}`,
      );
      const body = (await response.json()) as ContainerStatusResponse;

      if (body.status_code === 'FINISHED') {
        return;
      }
      if (body.status_code === 'ERROR' || body.status_code === 'EXPIRED') {
        throw new ServiceUnavailableException(
          `Instagram failed to process the video (status: ${body.status_code})`,
        );
      }
      await sleep(POLL_DELAY_MS);
    }
    throw new ServiceUnavailableException('Instagram video processing timed out');
  }

  private async publishContainer(
    igUserId: string,
    containerId: string,
    accessToken: string,
  ): Promise<string> {
    const response = await fetch(`${this.graphBaseUrl}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    });

    const body = (await response.json()) as PublishContainerResponse;
    if (!response.ok || !body.id) {
      throw new ServiceUnavailableException(
        `Instagram media publish failed: ${body.error?.message ?? response.statusText}`,
      );
    }
    return body.id;
  }
}
