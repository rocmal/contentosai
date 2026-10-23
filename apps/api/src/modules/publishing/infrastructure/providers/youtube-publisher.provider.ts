import { Readable } from 'node:stream';
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auth, youtube } from '@googleapis/youtube';
import {
  ISocialPublisher,
  SocialPublishRequest,
  SocialPublishResult,
} from '../../domain/interfaces/social-publisher.interface';
import { YOUTUBE_TITLE_LIMIT, youtubeSafeText } from '../../domain/post-media';

/** YouTube's description limit is 5,000 bytes (not characters - Hindi and Punjabi take 3 bytes a letter). */
const DESCRIPTION_MAX_BYTES = 5000;

function clipToBytes(text: string, maxBytes: number): string {
  let clipped = text;
  while (Buffer.byteLength(clipped, 'utf8') > maxBytes) clipped = clipped.slice(0, -1);
  return clipped;
}

/** What YouTube or Google said, in words a person can act on. Unknown errors keep Google's own message. */
export function youtubeFailureMessage(error: unknown): string {
  const response = (error as { response?: { data?: unknown } })?.response?.data as
    { error?: string | { message?: string; errors?: { reason?: string }[] } } | undefined;
  const oauthError = typeof response?.error === 'string' ? response.error : undefined;
  const apiError = typeof response?.error === 'object' ? response.error : undefined;
  const reason = apiError?.errors?.[0]?.reason;
  const message = apiError?.message ?? (error instanceof Error ? error.message : String(error));

  if (oauthError === 'invalid_grant' || /invalid_grant/.test(message)) {
    return 'Your YouTube connection has expired or was removed. Reconnect YouTube, then post again.';
  }
  if (reason === 'quotaExceeded') {
    return "Lumora has used up today's YouTube upload allowance from Google. Try again tomorrow.";
  }
  if (reason === 'uploadLimitExceeded') {
    return "This channel has reached YouTube's upload limit for today. Try again tomorrow.";
  }
  if (reason === 'youtubeSignupRequired') {
    return 'The connected Google account has no YouTube channel. Create one on YouTube, then reconnect.';
  }
  return `YouTube did not accept the video: ${message}`;
}

/**
 * Uploads to the connected channel via @googleapis/youtube (the scoped,
 * single-API package - NOT the full "googleapis" umbrella package, which
 * bundles 200+ Google APIs and can take minutes to require() on a cold
 * Windows disk with AV scanning). Handles resumable-upload chunking/retries
 * internally. Unlike Facebook's "here's a URL, go fetch it" API, YouTube's
 * videos.insert needs the actual bytes - this streams the video from our own
 * storage straight into the upload rather than buffering it in memory.
 *
 * Every upload says "not made for kids" and, for a video Lumora's AI made, "altered or synthetic content" (YouTube
 * asks creators to disclose realistic AI video). A vertical video of up to 3 minutes becomes a Short by itself.
 * Videos uploaded by an app Google has not audited are locked to private by YouTube, whatever visibility is asked for.
 */
@Injectable()
export class YouTubePublisherProvider implements ISocialPublisher {
  readonly name = 'youtube';

  constructor(private readonly configService: ConfigService) {}

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    const refreshToken = request.credentials.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new BadRequestException('Connect a YouTube channel before posting to it.');
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
      throw new ServiceUnavailableException(
        `Could not read the video to upload to YouTube (${source.status}).`,
      );
    }

    const title =
      youtubeSafeText(request.title ?? request.caption)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, YOUTUBE_TITLE_LIMIT) || 'Lumora video';
    const description = clipToBytes(
      youtubeSafeText(request.text ?? request.caption),
      DESCRIPTION_MAX_BYTES,
    );

    const youtubeClient = youtube({ version: 'v3', auth: oauth2Client });
    let videoId: string | null | undefined;
    try {
      const response = await youtubeClient.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: { title, description },
          status: {
            privacyStatus: request.visibility ?? 'public',
            selfDeclaredMadeForKids: false,
            containsSyntheticMedia: request.aiGenerated ?? false,
          },
        },
        media: {
          body: Readable.fromWeb(source.body as import('node:stream/web').ReadableStream),
        },
      });
      videoId = response.data.id;
    } catch (error) {
      throw new ServiceUnavailableException(youtubeFailureMessage(error));
    }

    if (!videoId) {
      throw new ServiceUnavailableException('YouTube did not return a video id');
    }

    return {
      externalPostId: videoId,
      permalink: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
}
