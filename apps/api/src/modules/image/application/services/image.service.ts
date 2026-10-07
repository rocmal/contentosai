import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { buildGenerationCacheKey } from '@shared/utils/generation-cache-key.util';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { IMAGE_CREDIT_COST, imageCreditCost } from '@modules/credits/credits.constants';
import { ImageProviderFactory } from '../../infrastructure/image-provider.factory';
import { ImageGenerationResult } from '../../domain/interfaces/image-provider.interface';
import { ImageQuality } from '../../domain/image-formats';
import { GenerateImageDto } from '../dto/generate-image.dto';

export interface ImageProviderOption {
  id: string;
  label: string;
  note: string;
  configured: boolean;
  recommended: boolean;
  qualities: { id: ImageQuality; label: string; credits: number }[];
}

const QUALITY_LABELS: Record<ImageQuality, string> = {
  draft: 'Draft - fast and cheap, for trying ideas',
  standard: 'Standard - good for most posts',
  high: 'High - best detail, for hero images',
};

@Injectable()
export class ImageService {
  constructor(
    private readonly providerFactory: ImageProviderFactory,
    private readonly storageService: StorageService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly creditsService: CreditsService,
    private readonly configService: ConfigService,
  ) {}

  async generateImage(
    dto: GenerateImageDto,
    user: AuthenticatedUser,
  ): Promise<ImageGenerationResult> {
    const count = dto.count ?? 1;
    const quality = dto.quality ?? 'standard';
    const saveToGallery = dto.saveToGallery ?? true;

    // Only a single-image request that is going to the gallery is cacheable -
    // "the same prompt" isn't a well-defined match against a multi-image batch,
    // and a preview is never stored, so there is nothing to find for it.
    const cacheKeyHash =
      count === 1 && saveToGallery
        ? buildGenerationCacheKey([
            'image',
            dto.provider,
            dto.model,
            dto.aspectRatio ?? dto.size,
            quality,
            dto.prompt,
          ])
        : null;

    if (cacheKeyHash) {
      const cached = await this.mediaAssetsService.findCached(user.id, cacheKeyHash);
      if (cached) {
        // A cache hit never calls the provider, so it never costs credits.
        return {
          provider: cached.provider ?? dto.provider,
          model: cached.model ?? dto.model ?? '',
          status: 'completed',
          images: [cached.url],
          creditsUsed: 0,
        };
      }
    }

    // Reserve before the (paid) provider call, not after - an insufficient
    // balance must block the call from ever happening, not get charged
    // retroactively for a generation the user can't afford.
    const canCharge = Boolean(user.organizationId && user.workspaceId);
    const cost = imageCreditCost(dto.provider, quality) * count;
    if (canCharge) {
      await this.creditsService.reserve({
        organizationId: user.organizationId!,
        workspaceId: user.workspaceId!,
        amount: cost,
        reason: CreditTransactionReason.GENERATION_IMAGE,
        userId: user.id,
      });
    }

    const provider = this.providerFactory.getProvider(dto.provider);
    let result: ImageGenerationResult;
    try {
      result = await provider.generateImage({
        prompt: dto.prompt,
        model: dto.model,
        size: dto.size,
        aspectRatio: dto.aspectRatio,
        quality,
        count: dto.count,
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

    this.eventEmitter.emit('image.generated', {
      provider: result.provider,
      model: result.model,
      userId: user.id,
    });

    const creditsUsed = canCharge ? cost : 0;

    if (result.status !== 'completed') {
      return { ...result, creditsUsed };
    }

    // Preview mode: hand the images back inline and store nothing. The user
    // saves the ones they want (cropped to a platform's size) with an explicit
    // upload, so the gallery only holds images they chose to keep.
    if (!saveToGallery || !user.organizationId || !user.workspaceId) {
      const inline: string[] = [];
      for (const image of result.images) {
        const { buffer, mimeType } = await this.resolveImageToBuffer(image);
        inline.push(`data:${mimeType};base64,${buffer.toString('base64')}`);
      }
      return { ...result, images: inline, creditsUsed };
    }

    // Persist each image to our own storage (provider URLs can expire) and
    // into the gallery - the first one also carries the cache key so a
    // repeat of this exact request is served from here next time.
    const persistedUrls: string[] = [];
    for (let index = 0; index < result.images.length; index += 1) {
      const { buffer, mimeType } = await this.resolveImageToBuffer(result.images[index]);
      const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
      const stored = await this.storageService.uploadFile(
        { originalname: `image-${Date.now()}-${index}.${extension}`, buffer, mimetype: mimeType },
        'gallery/images',
      );
      persistedUrls.push(stored.url);

      await this.mediaAssetsService.saveGenerated(
        {
          organizationId: user.organizationId,
          workspaceId: user.workspaceId,
          fileName: `image-${Date.now()}-${index}.${extension}`,
          storageKey: stored.key,
          url: stored.url,
          mimeType,
          sizeBytes: buffer.length,
          type: MediaAssetType.IMAGE,
          prompt: dto.prompt,
          provider: result.provider,
          model: result.model,
          cacheKeyHash: index === 0 ? cacheKeyHash : null,
        },
        user.id,
      );
    }

    return { ...result, images: persistedUrls, creditsUsed };
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }

  /** What Image Studio shows: the vendors worth offering, whether each has a
   * key configured on this server, and the credits each quality tier costs.
   * Built from the same cost table the charge uses, so the screen can never
   * quote a price that differs from what is taken. */
  getOptions(): { providers: ImageProviderOption[] } {
    const configured = (provider: string): boolean =>
      Boolean(this.configService.get<string>(`ai.image.${provider}.apiKey`));
    const tiers = (provider: string): ImageProviderOption['qualities'] =>
      (['draft', 'standard', 'high'] as const)
        .filter((id) => IMAGE_CREDIT_COST[provider]?.[id] !== undefined)
        .map((id) => ({ id, label: QUALITY_LABELS[id], credits: imageCreditCost(provider, id) }));

    return {
      providers: [
        {
          id: 'openai',
          label: 'OpenAI (gpt-image-2)',
          note: 'Best prompt following and text in images. Exact shapes for every platform.',
          configured: configured('openai'),
          recommended: true,
          qualities: tiers('openai'),
        },
      ],
    };
  }

  /** Image providers return either a data: URI or a (sometimes short-lived)
   * remote URL - this normalizes either into raw bytes for our own storage. */
  private async resolveImageToBuffer(
    imageRef: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const dataUriMatch = /^data:([^;]+);base64,(.+)$/.exec(imageRef);
    if (dataUriMatch) {
      const [, mimeType, base64] = dataUriMatch;
      return { buffer: Buffer.from(base64, 'base64'), mimeType };
    }

    const response = await fetch(imageRef);
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: response.headers.get('content-type') ?? 'image/png',
    };
  }
}
