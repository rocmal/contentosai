import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { CharacterProviderFactory } from '../../infrastructure/character-provider.factory';
import { CharacterGenerationResult } from '../../domain/interfaces/character-provider.interface';
import { GenerateCharacterDto } from '../dto/generate-character.dto';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
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

  async getJobStatus(providerName: string, jobId: string): Promise<CharacterGenerationResult> {
    const provider = this.providerFactory.getProvider(providerName);
    const result = await provider.getJobStatus(jobId);

    // Vendor result URLs (D-ID's, SadTalker's local file path, ...) are
    // often not fetchable directly from the browser - cloud buckets like
    // D-ID's frequently lack CORS headers for cross-origin fetch(), so the
    // frontend's "fetch it into a blob" step fails silently. Re-hosting
    // through our own storage (same-origin, CORS already configured) fixes
    // that and also means the clip survives after the vendor URL expires.
    if (result.status === 'completed' && result.videoUrl) {
      try {
        const rehostedUrl = await this.rehostVideo(result.videoUrl);
        return { ...result, videoUrl: rehostedUrl };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to re-host character video for job ${jobId}: ${message}`);
        // Fall back to the vendor's own URL rather than failing the whole
        // generation - it may still work for some clients/providers.
        return result;
      }
    }
    return result;
  }

  /** `source` is either a vendor's http(s) result URL (D-ID) or a local
   * filesystem path (SadTalker, which has no hosting of its own). */
  private async rehostVideo(source: string): Promise<string> {
    const buffer = source.startsWith('http')
      ? await this.downloadRemoteVideo(source)
      : await readFile(source);
    const stored = await this.storageService.uploadFile(
      { originalname: `character-${Date.now()}.mp4`, buffer, mimetype: 'video/mp4' },
      'character',
    );
    return stored.url;
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
