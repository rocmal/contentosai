import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { buildGenerationCacheKey } from '@shared/utils/generation-cache-key.util';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { CREDIT_COST } from '@modules/credits/credits.constants';
import { ImageProviderFactory } from '../../infrastructure/image-provider.factory';
import { ImageGenerationResult } from '../../domain/interfaces/image-provider.interface';
import { GenerateImageDto } from '../dto/generate-image.dto';

@Injectable()
export class ImageService {
  constructor(
    private readonly providerFactory: ImageProviderFactory,
    private readonly storageService: StorageService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly creditsService: CreditsService,
  ) {}

  async generateImage(
    dto: GenerateImageDto,
    user: AuthenticatedUser,
  ): Promise<ImageGenerationResult> {
    const count = dto.count ?? 1;
    // Only a single-image request is cacheable - "the same prompt" isn't a
    // well-defined match against a multi-image batch.
    const cacheKeyHash =
      count === 1
        ? buildGenerationCacheKey(['image', dto.provider, dto.model, dto.size, dto.prompt])
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
        };
      }
    }

    // Reserve before the (paid) provider call, not after - an insufficient
    // balance must block the call from ever happening, not get charged
    // retroactively for a generation the user can't afford.
    const canCharge = Boolean(user.organizationId && user.workspaceId);
    const cost = CREDIT_COST.IMAGE_PER_GENERATION * count;
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

    if (!user.organizationId || !user.workspaceId || result.status !== 'completed') {
      return result;
    }

    // Persist each image to our own storage (provider URLs can expire) and
    // into the gallery - the first one also carries the cache key so a
    // repeat of this exact request is served from here next time.
    const persistedUrls: string[] = [];
    for (let index = 0; index < result.images.length; index += 1) {
      const { buffer, mimeType } = await this.resolveImageToBuffer(result.images[index]);
      const extension = mimeType.split('/')[1] ?? 'png';
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

    return { ...result, images: persistedUrls };
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
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
