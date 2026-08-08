import { Readable } from 'node:stream';
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auth, youtube } from '@googleapis/youtube';
import {
  ISocialPublisher,
  SocialPublishRequest,
  SocialPublishResult,
} from '../../domain/interfaces/social-publisher.interface';

/**
 * Uploads to the connected channel via @googleapis/youtube (the scoped,
 * single-API package - NOT the full "googleapis" umbrella package, which
 * bundles 200+ Google APIs and can take minutes to require() on a cold
 * Windows disk with AV scanning). Handles resumable-upload chunking/retries
 * internally. Unlike Facebook's "here's a URL, go fetch it" API, YouTube's
 * videos.insert needs the actual bytes - this streams the video from our own
 * storage straight into the upload rather than buffering it in memory.
 */
@Injectable()
export class YouTubePublisherProvider implements ISocialPublisher {
  readonly name = 'youtube';

  constructor(private readonly configService: ConfigService) {}

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    const refreshToken = request.credentials.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new BadRequestException('A YouTube channel must be connected to publish this video');
    }
    if (!request.videoUrl) {
      throw new BadRequestException('A video is required to publish to YouTube');
    }

    const oauth2Client = new auth.OAuth2(
      this.configService.get<string>('youtube.clientId'),
      this.configService.get<string>('youtube.clientSecret'),
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const source = await fetch(request.videoUrl);
    if (!source.ok || !source.body) {
      throw new ServiceUnavailableException('Could not fetch the video to upload to YouTube');
    }

    const youtubeClient = youtube({ version: 'v3', auth: oauth2Client });
    const title = request.caption.slice(0, 100) || 'Lumora video';
    const response = await youtubeClient.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title, description: request.text ?? request.caption },
        status: { privacyStatus: 'public' },
      },
      media: {
        body: Readable.fromWeb(source.body as import('node:stream/web').ReadableStream),
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      throw new ServiceUnavailableException('YouTube did not return a video id');
    }

    return {
      externalPostId: videoId,
      permalink: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
}
