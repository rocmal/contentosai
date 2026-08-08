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

interface FacebookVideoUploadResponse extends GraphErrorResponse {
  id?: string;
}

@Injectable()
export class FacebookPublisherProvider implements ISocialPublisher {
  readonly name = 'facebook';

  constructor(private readonly configService: ConfigService) {}

  private get graphBaseUrl(): string {
    const version = this.configService.get<string>('meta.graphApiVersion') ?? 'v21.0';
    return `https://graph.facebook.com/${version}`;
  }

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    const pageId = request.credentials.pageId as string | undefined;
    const pageAccessToken = request.credentials.pageAccessToken as string;
    if (!pageId) {
      throw new BadRequestException('A Facebook Page must be selected to publish this video');
    }
    if (!request.videoUrl) {
      throw new BadRequestException('A video is required to publish to Facebook');
    }

    const response = await fetch(`${this.graphBaseUrl}/${pageId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: request.videoUrl,
        description: request.caption,
        access_token: pageAccessToken,
      }),
    });

    const body = (await response.json()) as FacebookVideoUploadResponse;
    if (!response.ok || !body.id) {
      throw new ServiceUnavailableException(
        `Facebook video publish failed: ${body.error?.message ?? response.statusText}`,
      );
    }

    return {
      externalPostId: body.id,
      permalink: `https://www.facebook.com/${body.id}`,
    };
  }
}
