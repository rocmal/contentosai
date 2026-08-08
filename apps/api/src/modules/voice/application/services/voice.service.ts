import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { buildGenerationCacheKey } from '@shared/utils/generation-cache-key.util';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { VoiceProviderFactory } from '../../infrastructure/voice-provider.factory';
import { VoiceGenerationResult, VoiceInfo } from '../../domain/interfaces/voice-provider.interface';
import { GenerateSpeechDto } from '../dto/generate-speech.dto';

export interface VoiceProviderStatus {
  name: string;
  available: boolean;
}

const WORDS_PER_MINUTE = 150;

/** VoiceGenerationResult carries no duration - the provider only returns
 * audio bytes, and parsing exact duration back out of arbitrary MP3/WAV
 * bytes isn't worth the complexity here. Estimate from input text length at
 * a typical speaking pace instead; "~1 minute" is already the precision the
 * landing page promises. */
function estimateVoiceCredits(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

@Injectable()
export class VoiceService {
  constructor(
    private readonly providerFactory: VoiceProviderFactory,
    private readonly storageService: StorageService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly creditsService: CreditsService,
  ) {}

  async generateSpeech(
    dto: GenerateSpeechDto,
    user: AuthenticatedUser,
  ): Promise<VoiceGenerationResult> {
    const provider = this.providerFactory.getProvider(dto.provider);
    const cacheKeyHash = buildGenerationCacheKey([
      'voice',
      provider.name,
      dto.model,
      dto.voiceId,
      dto.text,
    ]);

    const cached = await this.mediaAssetsService.findCached(user.id, cacheKeyHash);
    if (cached) {
      // A cache hit never calls the provider, so it never costs credits.
      const buffer = await this.storageService.readFile(cached.storageKey);
      return {
        provider: cached.provider ?? provider.name,
        model: cached.model ?? dto.model ?? '',
        mimeType: cached.mimeType,
        audioBase64: buffer.toString('base64'),
      };
    }

    const canCharge = Boolean(user.organizationId && user.workspaceId);
    const cost = estimateVoiceCredits(dto.text);
    if (canCharge) {
      await this.creditsService.reserve({
        organizationId: user.organizationId!,
        workspaceId: user.workspaceId!,
        amount: cost,
        reason: CreditTransactionReason.GENERATION_VOICE,
        userId: user.id,
      });
    }

    let result: VoiceGenerationResult;
    try {
      result = await provider.generateSpeech({
        text: dto.text,
        voiceId: dto.voiceId,
        model: dto.model,
      });
    } catch (err) {
      if (canCharge) {
        await this.creditsService.refund({
          organizationId: user.organizationId!,
          workspaceId: user.workspaceId!,
          amount: cost,
          userId: user.id,
        });
      }
      throw err;
    }

    this.eventEmitter.emit('voice.generated', { provider: result.provider, userId: user.id });

    if (user.organizationId && user.workspaceId) {
      const buffer = Buffer.from(result.audioBase64, 'base64');
      const extension = result.mimeType.includes('mpeg')
        ? 'mp3'
        : (result.mimeType.split('/')[1] ?? 'mp3');
      const fileName = `speech-${Date.now()}.${extension}`;
      const stored = await this.storageService.uploadFile(
        { originalname: fileName, buffer, mimetype: result.mimeType },
        'gallery/voice',
      );

      await this.mediaAssetsService.saveGenerated(
        {
          organizationId: user.organizationId,
          workspaceId: user.workspaceId,
          fileName,
          storageKey: stored.key,
          url: stored.url,
          mimeType: result.mimeType,
          sizeBytes: buffer.length,
          type: MediaAssetType.AUDIO,
          prompt: dto.text,
          provider: result.provider,
          model: result.model,
          voiceId: dto.voiceId ?? null,
          cacheKeyHash,
        },
        user.id,
      );
    }

    return result;
  }

  async listVoices(providerName?: string): Promise<VoiceInfo[]> {
    return this.providerFactory.getProvider(providerName).listVoices();
  }

  async getProviderStatuses(): Promise<VoiceProviderStatus[]> {
    const names = this.providerFactory.listProviders();
    return Promise.all(
      names.map(async (name) => ({
        name,
        available: await this.providerFactory.getProvider(name).healthCheck(),
      })),
    );
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
