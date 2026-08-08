import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISocialPublisher,
  SocialPublishRequest,
  SocialPublishResult,
} from '../../domain/interfaces/social-publisher.interface';

interface LinkedInErrorResponse {
  message?: string;
}

interface InitializeVideoUploadResponse extends LinkedInErrorResponse {
  value?: { uploadUrl?: string; video?: string };
}

interface CreatePostResponse extends LinkedInErrorResponse {
  id?: string;
}

const REST_BASE_URL = 'https://api.linkedin.com/rest';

/**
 * Posts as the connected member via LinkedIn's versioned Posts API. Text is
 * the primary case (AI Studio's "LinkedIn Post" content type has no video);
 * when a videoUrl is present it's uploaded to LinkedIn first and attached.
 */
@Injectable()
export class LinkedInPublisherProvider implements ISocialPublisher {
  readonly name = 'linkedin';

  constructor(private readonly configService: ConfigService) {}

  private get apiVersion(): string {
    return this.configService.get<string>('linkedin.apiVersion') ?? '202401';
  }

  private get headers(): Record<string, string> {
    return {
      'LinkedIn-Version': this.apiVersion,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    };
  }

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    const authorUrn = request.credentials.authorUrn as string | undefined;
    const accessToken = request.credentials.accessToken as string;
    if (!authorUrn) {
      throw new BadRequestException('A LinkedIn account must be connected to publish this post');
    }
    if (!request.text && !request.videoUrl) {
      throw new BadRequestException('LinkedIn posts need text or a video');
    }

    const videoUrn = request.videoUrl
      ? await this.uploadVideo(authorUrn, request.videoUrl, accessToken)
      : undefined;

    const postId = await this.createPost(
      authorUrn,
      request.text ?? request.caption,
      videoUrn,
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
    videoUrn: string | undefined,
    accessToken: string,
  ): Promise<string> {
    const response = await fetch(`${REST_BASE_URL}/posts`, {
      method: 'POST',
      headers: { ...this.headers, Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        author: authorUrn,
        commentary,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: videoUrn ? { media: { id: videoUrn } } : undefined,
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as CreatePostResponse;
      throw new ServiceUnavailableException(
        `LinkedIn post publish failed: ${body.message ?? response.statusText}`,
      );
    }

    const postUrn = response.headers.get('x-restli-id') ?? response.headers.get('x-linkedin-id');
    if (!postUrn) {
      throw new ServiceUnavailableException('LinkedIn did not return a post id');
    }
    return postUrn;
  }

  /** LinkedIn requires the raw bytes, not a URL - fetch our stored video and
   * re-upload it to LinkedIn's provided upload URL before referencing it. */
  private async uploadVideo(
    authorUrn: string,
    videoUrl: string,
    accessToken: string,
  ): Promise<string> {
    const initResponse = await fetch(`${REST_BASE_URL}/videos?action=initializeUpload`, {
      method: 'POST',
      headers: { ...this.headers, Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        initializeUploadRequest: { owner: authorUrn },
      }),
    });
    const initBody = (await initResponse.json()) as InitializeVideoUploadResponse;
    const uploadUrl = initBody.value?.uploadUrl;
    const videoUrn = initBody.value?.video;
    if (!initResponse.ok || !uploadUrl || !videoUrn) {
      throw new ServiceUnavailableException(
        `LinkedIn video upload initialization failed: ${initBody.message ?? initResponse.statusText}`,
      );
    }

    const sourceVideo = await fetch(videoUrl);
    if (!sourceVideo.ok || !sourceVideo.body) {
      throw new ServiceUnavailableException('Could not fetch the video to upload to LinkedIn');
    }
    const videoBytes = await sourceVideo.arrayBuffer();

    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: videoBytes,
    });
    if (!putResponse.ok) {
      throw new ServiceUnavailableException(
        `Uploading video bytes to LinkedIn failed: ${putResponse.statusText}`,
      );
    }

    return videoUrn;
  }
}
