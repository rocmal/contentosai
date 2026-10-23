import { BadRequestException, Injectable } from '@nestjs/common';
import { ContentService } from '@modules/content/application/services/content.service';
import { ContentType } from '@modules/content/domain/entities/content.entity';
import { IntegrationsService } from '@modules/integrations/application/services/integrations.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAsset, MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { formatIndiaDate } from '@shared/utils/india-time.util';
import { PublishingJob } from '../../domain/entities/publishing-job.entity';
import {
  PLATFORM_MEDIA_SUPPORT,
  PLATFORM_NAMES,
  PLATFORM_TEXT_LIMIT,
  PostMediaKind,
  SocialPlatform,
  youtubeSafeText,
} from '../../domain/post-media';
import { CreateSocialPostDto } from '../dto/create-social-post.dto';
import { PublishingJobsService } from './publishing-jobs.service';

/** Who is posting - taken from the signed-in user, never from the request body. */
export interface SocialPostActor {
  id: string;
  organizationId: string | null;
  workspaceId: string | null;
  roles: string[];
}

export interface CreatedSocialPost {
  contentId: string;
  jobs: PublishingJob[];
}

/** A scheduled time must leave the worker a moment to pick it up. */
const MIN_LEAD_MS = 60_000;
const TITLE_MAX = 100;

function mediaKind(asset: MediaAsset | null): PostMediaKind {
  if (!asset) return 'none';
  if (asset.type === MediaAssetType.IMAGE) return 'image';
  if (asset.type === MediaAssetType.VIDEO || asset.type === MediaAssetType.CHARACTER)
    return 'video';
  throw new BadRequestException('Only an image or a video from your Gallery can be posted.');
}

/** A short title for the Calendar: the first line of the text, or the attached file's name. */
function postTitle(text: string, asset: MediaAsset | null): string {
  const firstLine =
    text
      .split('\n')
      .find((line) => line.trim())
      ?.trim() ?? '';
  const title = firstLine || asset?.fileName.replace(/\.[a-z0-9]{1,5}$/i, '') || 'Post';
  return title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX - 1).trimEnd()}…` : title;
}

/**
 * The composer's "Post now" / "Schedule": checks the post against every chosen account (what media it takes, how much
 * text, whether it is connected and, for LinkedIn, whether the sign-in will still be valid), then saves one Content
 * record and a publishing job per account. The jobs go through the same queue and worker as every other post.
 */
@Injectable()
export class SocialPostsService {
  constructor(
    private readonly publishingJobsService: PublishingJobsService,
    private readonly contentService: ContentService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async create(dto: CreateSocialPostDto, actor: SocialPostActor): Promise<CreatedSocialPost> {
    const { organizationId, workspaceId } = actor;
    if (!organizationId || !workspaceId) {
      throw new BadRequestException('An active organization and workspace are required to post.');
    }

    const text = dto.text.trim();
    // Only the workspace's own Gallery items - an id from anywhere else looks like it does not exist.
    const asset = dto.mediaAssetId
      ? await this.mediaAssetsService.findForActor(dto.mediaAssetId, { ...actor, workspaceId })
      : null;
    const kind = mediaKind(asset);
    if (kind === 'none' && !text) {
      throw new BadRequestException('Write something to post, or add an image or video.');
    }

    const when = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
    if (
      dto.scheduledAt &&
      (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + MIN_LEAD_MS)
    ) {
      throw new BadRequestException('Pick a time at least a minute from now, or post now.');
    }

    for (const platform of dto.platforms) {
      await this.checkPlatform(platform, kind, text, workspaceId, when);
    }
    const toYouTube = dto.platforms.includes('youtube');
    // YouTube needs a title; it is also the post's title in the Calendar, where it can be edited.
    const title = (toYouTube ? youtubeSafeText(dto.title ?? '') : (dto.title ?? '')).trim();
    if (toYouTube && !title) {
      throw new BadRequestException('Give the YouTube video a title.');
    }

    const content = await this.contentService.create(
      {
        organizationId,
        workspaceId,
        title: title || postTitle(text, asset),
        body: text,
        type:
          kind === 'image'
            ? ContentType.IMAGE
            : kind === 'video'
              ? ContentType.VIDEO
              : ContentType.TEXT,
        aiGenerated: false,
        metadata: {
          source: 'composer',
          // The worker posts metadata.caption, and editing a scheduled post in the Calendar updates it.
          caption: text,
          ...(asset ? { mediaAssetId: asset.id } : {}),
          ...(kind === 'image' && asset ? { imageUrl: asset.url } : {}),
          ...(kind === 'video' && asset ? { videoUrl: asset.url } : {}),
          // Made by one of Lumora's AI engines: YouTube is told it is altered or synthetic content.
          ...(asset?.provider ? { aiGenerated: true } : {}),
          ...(toYouTube ? { visibility: dto.visibility ?? 'public' } : {}),
        },
      },
      actor.id,
    );

    const jobs: PublishingJob[] = [];
    for (const platform of dto.platforms) {
      jobs.push(
        await this.publishingJobsService.create(
          {
            organizationId,
            workspaceId,
            contentId: content.id,
            platform,
            scheduledAt: when.toISOString(),
          },
          actor.id,
        ),
      );
    }
    return { contentId: content.id, jobs };
  }

  private async checkPlatform(
    platform: SocialPlatform,
    kind: PostMediaKind,
    text: string,
    workspaceId: string,
    when: Date,
  ): Promise<void> {
    const name = PLATFORM_NAMES[platform];
    if (!PLATFORM_MEDIA_SUPPORT[platform].includes(kind)) {
      throw new BadRequestException(
        kind === 'none'
          ? `${name} needs a video. Add one from your Gallery, or post the text to LinkedIn.`
          : `${name} can only post a video from Lumora for now.`,
      );
    }
    if (text.length > PLATFORM_TEXT_LIMIT[platform]) {
      throw new BadRequestException(
        `${name} takes up to ${PLATFORM_TEXT_LIMIT[platform].toLocaleString('en-IN')} characters; this post has ${text.length.toLocaleString('en-IN')}.`,
      );
    }

    const credentials = await this.integrationsService.getDecryptedCredentials(
      workspaceId,
      platform,
    );
    if (!credentials) {
      throw new BadRequestException(`Connect ${name} in Integrations first.`);
    }
    const expiresAt = typeof credentials.expiresAt === 'number' ? credentials.expiresAt : null;
    if (expiresAt && expiresAt <= when.getTime()) {
      const date = formatIndiaDate(new Date(expiresAt));
      throw new BadRequestException(
        expiresAt <= Date.now()
          ? `Your ${name} connection expired on ${date}. Reconnect ${name} in Integrations, then post again.`
          : `Your ${name} connection runs out on ${date}, before this post's time. Reconnect ${name} in Integrations, or pick an earlier time.`,
      );
    }
  }
}
