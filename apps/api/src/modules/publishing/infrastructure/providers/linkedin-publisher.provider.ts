import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatIndiaDate } from '@shared/utils/india-time.util';
import {
  ISocialPublisher,
  SocialPublishRequest,
  SocialPublishResult,
} from '../../domain/interfaces/social-publisher.interface';
import { toLinkedInCommentary } from './linkedin-commentary';

interface LinkedInErrorBody {
  message?: string;
}

interface InitializeImageUploadResponse extends LinkedInErrorBody {
  value?: { uploadUrl?: string; image?: string };
}

interface InitializeVideoUploadResponse extends LinkedInErrorBody {
  value?: {
    video?: string;
    uploadToken?: string;
    uploadInstructions?: { uploadUrl: string; firstByte: number; lastByte: number }[];
  };
}

interface VideoStatusResponse extends LinkedInErrorBody {
  status?: 'WAITING_UPLOAD' | 'PROCESSING' | 'AVAILABLE' | 'PROCESSING_FAILED';
}

const REST_BASE_URL = 'https://api.linkedin.com/rest';
/** How long to wait for LinkedIn to finish processing an uploaded video before posting it. */
const VIDEO_READY_TIMEOUT_MS = 5 * 60_000;
const VIDEO_READY_POLL_MS = 5_000;

/**
 * LinkedIn retires each monthly API version (YYYYMM) about a year after it comes out. Unless LINKEDIN_API_VERSION
 * pins one, use the version from three months ago: always released, and well inside that year.
 */
export function defaultLinkedInVersion(now: Date = new Date()): string {
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
  return `${month.getUTCFullYear()}${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** A pinned version older than this many months is ignored: LinkedIn retires versions about a year after release. */
export const PINNED_VERSION_MAX_AGE_MONTHS = 10;

/**
 * The version to send. A pin (LINKEDIN_API_VERSION) is used only while it is released and young enough; otherwise
 * the automatic one. A stale "202401" left in the live server's settings file made LinkedIn refuse every post in
 * October 2026 ("Requested version 20240101 is not active").
 */
export function effectiveLinkedInVersion(
  pinned: string | undefined,
  now: Date = new Date(),
): string {
  const automatic = defaultLinkedInVersion(now);
  if (!pinned || !/^\d{6}$/.test(pinned)) return automatic;
  const ageMonths =
    now.getUTCFullYear() * 12 +
    now.getUTCMonth() -
    (Number(pinned.slice(0, 4)) * 12 + Number(pinned.slice(4)) - 1);
  return ageMonths >= 0 && ageMonths <= PINNED_VERSION_MAX_AGE_MONTHS ? pinned : automatic;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Posts as the connected member (personal profile, `w_member_social`) through LinkedIn's versioned Posts API: text on
 * its own, or with one image (Images API) or one video (Videos API: upload in parts, finalize, wait until processed).
 * Company Page posting needs LinkedIn's Community Management API approval and is not part of this.
 */
@Injectable()
export class LinkedInPublisherProvider implements ISocialPublisher {
  readonly name = 'linkedin';
  private readonly logger = new Logger(LinkedInPublisherProvider.name);
  private warnedAboutPin = false;

  /** Test seam: how long to wait between video status checks. */
  protected videoPollMs = VIDEO_READY_POLL_MS;

  constructor(private readonly configService: ConfigService) {}

  private get apiVersion(): string {
    const pinned = this.configService.get<string>('linkedin.apiVersion') || '';
    const version = effectiveLinkedInVersion(pinned);
    if (pinned && version !== pinned && !this.warnedAboutPin) {
      this.warnedAboutPin = true;
      this.logger.warn(
        `LINKEDIN_API_VERSION=${pinned} is retired or invalid; using ${version}. Remove the setting from the server.`,
      );
    }
    return version;
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': this.apiVersion,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    };
  }

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    const authorUrn = request.credentials.authorUrn as string | undefined;
    const accessToken = request.credentials.accessToken as string | undefined;
    if (!authorUrn || !accessToken) {
      throw new BadRequestException('Connect LinkedIn in Integrations to publish this post.');
    }
    const expiresAt = request.credentials.expiresAt;
    if (typeof expiresAt === 'number' && expiresAt <= Date.now()) {
      throw new BadRequestException(
        `Your LinkedIn connection expired on ${formatIndiaDate(new Date(expiresAt))}. Reconnect LinkedIn in Integrations, then post again.`,
      );
    }

    const text = (request.text ?? request.caption ?? '').trim();
    if (!text && !request.imageUrl && !request.videoUrl) {
      throw new BadRequestException('A LinkedIn post needs text, an image or a video.');
    }

    const mediaUrn = request.videoUrl
      ? await this.uploadVideo(authorUrn, request.videoUrl, accessToken)
      : request.imageUrl
        ? await this.uploadImage(authorUrn, request.imageUrl, accessToken)
        : undefined;

    const postId = await this.createPost(
      authorUrn,
      toLinkedInCommentary(text),
      mediaUrn,
      accessToken,
    );
    return {
      externalPostId: postId,
      permalink: `https://www.linkedin.com/feed/update/${postId}`,
    };
  }

  private async createPost(
    authorUrn: string,
    commentary: string,
    mediaUrn: string | undefined,
    accessToken: string,
  ): Promise<string> {
    const response = await fetch(`${REST_BASE_URL}/posts`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        author: authorUrn,
        commentary,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        ...(mediaUrn ? { content: { media: { id: mediaUrn } } } : {}),
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!response.ok) {
      throw await this.failure('LinkedIn did not accept the post', response);
    }
    const postUrn = response.headers.get('x-restli-id') ?? response.headers.get('x-linkedin-id');
    if (!postUrn) {
      throw new ServiceUnavailableException('LinkedIn did not return a post id');
    }
    return postUrn;
  }

  /** Images API: ask for an upload address, send the bytes, and reference the image by its URN. */
  private async uploadImage(
    authorUrn: string,
    imageUrl: string,
    accessToken: string,
  ): Promise<string> {
    const init = await fetch(`${REST_BASE_URL}/images?action=initializeUpload`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
    });
    const initBody = (await init.json().catch(() => ({}))) as InitializeImageUploadResponse;
    const uploadUrl = initBody.value?.uploadUrl;
    const imageUrn = initBody.value?.image;
    if (!init.ok || !uploadUrl || !imageUrn) {
      throw new ServiceUnavailableException(
        `LinkedIn could not start the image upload: ${initBody.message ?? init.statusText}`,
      );
    }

    const bytes = await this.readMedia(imageUrl);
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: bytes,
    });
    if (!put.ok) {
      throw new ServiceUnavailableException(
        `Uploading the image to LinkedIn failed: ${put.status} ${put.statusText}`,
      );
    }
    return imageUrn;
  }

  /**
   * Videos API: initialize with the file size, upload each part LinkedIn asks for (keeping the ETags), finalize, then
   * wait until LinkedIn has processed the video - a post that points at an unprocessed video is refused.
   */
  private async uploadVideo(
    authorUrn: string,
    videoUrl: string,
    accessToken: string,
  ): Promise<string> {
    const bytes = await this.readMedia(videoUrl);

    const init = await fetch(`${REST_BASE_URL}/videos?action=initializeUpload`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: bytes.byteLength,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    });
    const initBody = (await init.json().catch(() => ({}))) as InitializeVideoUploadResponse;
    const videoUrn = initBody.value?.video;
    const instructions = initBody.value?.uploadInstructions ?? [];
    if (!init.ok || !videoUrn || instructions.length === 0) {
      throw new ServiceUnavailableException(
        `LinkedIn could not start the video upload: ${initBody.message ?? init.statusText}`,
      );
    }

    const uploadedPartIds: string[] = [];
    for (const part of instructions) {
      const put = await fetch(part.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes.slice(part.firstByte, part.lastByte + 1),
      });
      const etag = put.headers.get('etag');
      if (!put.ok || !etag) {
        throw new ServiceUnavailableException(
          `Uploading the video to LinkedIn failed: ${put.status} ${put.statusText}`,
        );
      }
      uploadedPartIds.push(etag);
    }

    const finalize = await fetch(`${REST_BASE_URL}/videos?action=finalizeUpload`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken: initBody.value?.uploadToken ?? '',
          uploadedPartIds,
        },
      }),
    });
    if (!finalize.ok) {
      throw await this.failure('LinkedIn could not finish the video upload', finalize);
    }

    await this.waitUntilVideoReady(videoUrn, accessToken);
    return videoUrn;
  }

  private async waitUntilVideoReady(videoUrn: string, accessToken: string): Promise<void> {
    const deadline = Date.now() + VIDEO_READY_TIMEOUT_MS;
    for (;;) {
      const response = await fetch(`${REST_BASE_URL}/videos/${encodeURIComponent(videoUrn)}`, {
        headers: this.headers(accessToken),
      });
      const body = (await response.json().catch(() => ({}))) as VideoStatusResponse;
      if (response.ok && body.status === 'AVAILABLE') return;
      if (body.status === 'PROCESSING_FAILED') {
        throw new ServiceUnavailableException(
          'LinkedIn could not process this video. Try a shorter MP4.',
        );
      }
      if (Date.now() >= deadline) {
        throw new ServiceUnavailableException(
          'LinkedIn is still processing the video. Try posting it again in a few minutes.',
        );
      }
      await sleep(this.videoPollMs);
    }
  }

  /** The Gallery file's bytes (LinkedIn needs the file itself, not its address). */
  private async readMedia(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Could not read the file to post (${response.status}).`,
      );
    }
    return response.arrayBuffer();
  }

  private async failure(prefix: string, response: Response): Promise<ServiceUnavailableException> {
    const body = (await response.json().catch(() => ({}))) as LinkedInErrorBody;
    return new ServiceUnavailableException(
      `${prefix}: ${body.message ?? `${response.status} ${response.statusText}`}`,
    );
  }
}
