import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { buildGenerationCacheKey } from '@shared/utils/generation-cache-key.util';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import {
  creditsForDurationSeconds,
  videoCreditsPer10Seconds,
} from '@modules/credits/credits.constants';
import { VideoProviderFactory } from '../../infrastructure/video-provider.factory';
import { VideoGenerationResult } from '../../domain/interfaces/video-provider.interface';
import { GenerateVideoDto } from '../dto/generate-video.dto';
import { VideoJobSubmittedEvent } from '../events/video-job-submitted.event';

const DEFAULT_DURATION_SECONDS = 5;

/** Same words, case and spacing differences ignored, plus the same shape of clip -> same clip. */
function promptCacheKey(dto: GenerateVideoDto): string {
  return buildGenerationCacheKey([
    'video-prompt',
    dto.provider,
    dto.model,
    dto.prompt.replace(/\s+/g, ' '),
    dto.durationSeconds ?? DEFAULT_DURATION_SECONDS,
    dto.aspectRatio ?? '16:9',
    dto.imageUrl,
  ]);
}

export interface SubmitJobActor {
  userId?: string;
  organizationId?: string | null;
  workspaceId?: string | null;
  /** Signature of the prompt that started the job (see promptCacheKey). */
  cacheKey?: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly providerFactory: VideoProviderFactory,
    private readonly storageService: StorageService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly creditsService: CreditsService,
  ) {}

  /** Video generation is asynchronous vendor-side (see VideoProcessor) - the
   * charge happens here, at submission, not on eventual completion. A
   * synchronous rejection from the provider (bad request, no credentials,
   * etc.) refunds immediately; a job accepted here but that later fails
   * vendor-side keeps its charge, matching how the vendor's own compute
   * cost was already incurred once the job was accepted. */
  async submitJob(
    dto: GenerateVideoDto,
    actor: SubmitJobActor = {},
  ): Promise<VideoGenerationResult> {
    const canCharge = Boolean(actor.organizationId && actor.workspaceId);
    const cacheKey = promptCacheKey(dto);

    // The same user asking for the same clip again gets the saved one - free and instant.
    if (actor.userId && !dto.fresh) {
      const cached = await this.mediaAssetsService.findCached(actor.userId, cacheKey);
      if (cached) {
        return {
          provider: dto.provider,
          model: dto.model ?? cached.model ?? '',
          jobId: `cached-${cacheKey.slice(0, 16)}`,
          status: 'completed',
          videoUrl: cached.url,
          cacheKey,
          cached: true,
        };
      }
    }

    const cost =
      creditsForDurationSeconds(dto.durationSeconds ?? DEFAULT_DURATION_SECONDS, 10) *
      videoCreditsPer10Seconds(dto.provider);
    if (canCharge) {
      await this.creditsService.reserve({
        organizationId: actor.organizationId!,
        workspaceId: actor.workspaceId!,
        amount: cost,
        reason: CreditTransactionReason.GENERATION_VIDEO,
        userId: actor.userId,
      });
    }

    const provider = this.providerFactory.getProvider(dto.provider);
    let result: VideoGenerationResult;
    try {
      result = await provider.submitJob({
        prompt: dto.prompt,
        model: dto.model,
        imageUrl: dto.imageUrl,
        durationSeconds: dto.durationSeconds,
        aspectRatio: dto.aspectRatio,
      });
    } catch (err) {
      if (canCharge) {
        await this.creditsService.refund({
          organizationId: actor.organizationId!,
          workspaceId: actor.workspaceId!,
          amount: cost,
          userId: actor.userId,
        });
      }
      throw err;
    }

    this.eventEmitter.emit(
      'video.job-submitted',
      new VideoJobSubmittedEvent(
        result.provider,
        result.jobId,
        actor.userId,
        actor.organizationId,
        actor.workspaceId,
        cacheKey,
      ),
    );

    return { ...result, cacheKey };
  }

  /** `actor` is optional (and getJobStatus is called by anyone polling a
   * jobId+provider pair) but only present with a full tenant context can a
   * completed clip be persisted - matching submitJob's own canCharge gate. */
  async getJobStatus(
    providerName: string,
    jobId: string,
    actor: SubmitJobActor = {},
  ): Promise<VideoGenerationResult> {
    const provider = this.providerFactory.getProvider(providerName);
    const result = await provider.getJobStatus(jobId);

    if (
      result.status === 'completed' &&
      result.videoUrl &&
      actor.userId &&
      actor.organizationId &&
      actor.workspaceId
    ) {
      return this.persistCompletedVideo(result, {
        userId: actor.userId,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        cacheKey: actor.cacheKey,
      });
    }

    return result;
  }

  /** Re-hosts a completed clip into our own storage and the gallery, mirroring
   * ImageService.generateImage's "persist + return our own URL" pattern -
   * provider URLs can expire, and this is also what makes the clip show up
   * in Recent Generations / the media gallery at all.
   *
   * Idempotent per jobId via the same findCached/cacheKeyHash mechanism
   * image generation uses for prompt-based caching: the frontend polls this
   * endpoint repeatedly while a job is in flight, so without a cache check
   * every poll after completion would re-download and re-upload the same
   * video. Never throws - a caller checking job status must still get the
   * status back even if persistence fails (gallery cap, storage outage,
   * etc.); it just won't show up in the gallery this time. */
  private async persistCompletedVideo(
    result: VideoGenerationResult,
    actor: { userId: string; organizationId: string; workspaceId: string; cacheKey?: string },
  ): Promise<VideoGenerationResult> {
    const jobKeyHash = buildGenerationCacheKey(['video-job', result.provider, result.jobId]);
    // Saved under the prompt's signature when known, so asking again reuses it.
    const cacheKeyHash = actor.cacheKey ?? jobKeyHash;

    try {
      // Look under both signatures: whichever poller saved it first (the browser or the
      // background worker) may not have known the prompt's signature.
      const cached =
        (await this.mediaAssetsService.findCached(actor.userId, cacheKeyHash)) ??
        (cacheKeyHash !== jobKeyHash
          ? await this.mediaAssetsService.findCached(actor.userId, jobKeyHash)
          : null);
      if (cached) {
        return { ...result, videoUrl: cached.url };
      }

      const provider = this.providerFactory.getProvider(result.provider);
      const response = await (provider.fetchVideo?.(result.videoUrl!) ?? fetch(result.videoUrl!));
      if (!response.ok) {
        throw new Error(`Fetching provider video failed (${response.status})`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') ?? 'video/mp4';

      const stored = await this.storageService.uploadFile(
        { originalname: `video-${result.jobId}.mp4`, buffer, mimetype: mimeType },
        'gallery/videos',
      );

      await this.mediaAssetsService.saveGenerated(
        {
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          fileName: `video-${result.jobId}.mp4`,
          storageKey: stored.key,
          url: stored.url,
          mimeType,
          sizeBytes: buffer.length,
          type: MediaAssetType.VIDEO,
          prompt: null,
          provider: result.provider,
          model: result.model,
          cacheKeyHash,
        },
        actor.userId,
      );

      return { ...result, videoUrl: stored.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to persist completed video for job ${result.jobId}: ${message}`);
      return result;
    }
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
