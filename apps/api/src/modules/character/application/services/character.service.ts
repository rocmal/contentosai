import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { CharacterProviderFactory } from '../../infrastructure/character-provider.factory';
import { CharacterGenerationResult } from '../../domain/interfaces/character-provider.interface';
import { GenerateCharacterDto } from '../dto/generate-character.dto';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { buildGenerationCacheKey } from '@shared/utils/generation-cache-key.util';import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { creditsForDurationSeconds } from '@modules/credits/credits.constants';

const WORDS_PER_MINUTE = 150;

export interface SubmitJobActor {
  userId?: string;
  organizationId?: string | null;
  workspaceId?: string | null;
}

/** No duration field exists on this DTO - a talking-avatar clip's length is
 * whatever the TTS engine takes to read the script, unknowable until the
 * provider finishes. Estimate it from script length at a typical speaking
 * pace, same approach as VoiceService's credit estimate. */
function estimateScriptSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return (words / WORDS_PER_MINUTE) * 60;
}

@Injectable()
export class CharacterService {
  private readonly logger = new Logger(CharacterService.name);

  constructor(
    private readonly providerFactory: CharacterProviderFactory,
    private readonly storageService: StorageService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly creditsService: CreditsService,
  ) {}

  /** Charged at submission, not completion - same reasoning as
   * VideoService.submitJob: this is an asynchronous vendor job, and the
   * vendor's compute cost is incurred once accepted regardless of whether
   * polling later reports success. */
  async submitJob(dto: GenerateCharacterDto, actor: SubmitJobActor = {}): Promise<CharacterGenerationResult> {
    const canCharge = Boolean(actor.organizationId && actor.workspaceId);
    const cost = creditsForDurationSeconds(estimateScriptSeconds(dto.script), 10);
    if (canCharge) {
      await this.creditsService.reserve({
        organizationId: actor.organizationId!,
        workspaceId: actor.workspaceId!,
        amount: cost,
        reason: CreditTransactionReason.GENERATION_CHARACTER,
        userId: actor.userId,
      });
    }

    const provider = this.providerFactory.getProvider(dto.provider);
    try {
      return await provider.submitJob({
        sourceImageUrl: dto.sourceImageUrl,
        script: dto.script,
        voiceId: dto.voiceId,
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
  }

  async getJobStatus(
    providerName: string,
    jobId: string,
    actor: SubmitJobActor = {},
  ): Promise<CharacterGenerationResult> {
    const provider = this.providerFactory.getProvider(providerName);
    const result = await provider.getJobStatus(jobId);

    // Vendor result URLs (D-ID's, SadTalker's local file path, ...) are
    // often not fetchable directly from the browser - cloud buckets like
    // D-ID's frequently lack CORS headers for cross-origin fetch(), so the
    // frontend's "fetch it into a blob" step fails silently. Re-hosting
    // through our own storage (same-origin, CORS already configured) fixes
    // that and also means the clip survives after the vendor URL expires.
    // Saving it into the gallery is the same trip: no reason to download
    // and re-upload a clip once just to serve it, then again to keep it.
    if (result.status === 'completed' && result.videoUrl) {
      return this.persistCompletedCharacterVideo(result, providerName, jobId, actor);
    }
    return result;
  }

  /** Idempotent per (provider, jobId) via findCached, same mechanism
   * VideoService uses - the frontend polls this endpoint repeatedly while a
   * job is in flight, and previously every poll after completion re-
   * downloaded and re-uploaded the same clip with no caching at all. Only
   * userId is required for the cache check (findCached is keyed on it, not
   * on org/workspace); saveGenerated additionally needs org+workspace, so a
   * user with no tenant context yet still gets the CORS re-host but isn't
   * added to a gallery - same canCharge-style gate submitJob already uses.
   * Never throws - a status check must still return the status even if
   * persistence fails. */
  private async persistCompletedCharacterVideo(
    result: CharacterGenerationResult,
    providerName: string,
    jobId: string,
    actor: SubmitJobActor,
  ): Promise<CharacterGenerationResult> {
    const cacheKeyHash = buildGenerationCacheKey(['character-job', providerName, jobId]);

    try {
      if (actor.userId) {
        const cached = await this.mediaAssetsService.findCached(actor.userId, cacheKeyHash);
        if (cached) {
          return { ...result, videoUrl: cached.url };
        }
      }

      const source = result.videoUrl!;
      const buffer = source.startsWith('http') ? await this.downloadRemoteVideo(source) : await readFile(source);
      const stored = await this.storageService.uploadFile(
        { originalname: `character-${jobId}.mp4`, buffer, mimetype: 'video/mp4' },
        'character',
      );

      if (actor.userId && actor.organizationId && actor.workspaceId) {
        await this.mediaAssetsService.saveGenerated(
          {
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            fileName: `character-${jobId}.mp4`,
            storageKey: stored.key,
            url: stored.url,
            mimeType: 'video/mp4',
            sizeBytes: buffer.length,
            type: MediaAssetType.CHARACTER,
            prompt: null,
            provider: result.provider,
            cacheKeyHash,
          },
          actor.userId,
        );
      }

      return { ...result, videoUrl: stored.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to persist completed character video for job ${jobId}: ${message}`);
      // Fall back to the vendor's own URL rather than failing the whole
      // status check - it may still work for some clients/providers.
      return result;
    }
  }

  private async downloadRemoteVideo(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetching vendor video failed (${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
