import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { BrandProfilesService } from '@modules/brand/application/services/brand-profiles.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAsset, MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { PreparedPicture, preparePicture } from '../../infrastructure/picture-input';
import { AIContentGeneratedEvent } from '../events/ai-content-generated.event';
import { buildBrandPromptParts } from '../content-studio/brand-context';
import { WritePostDto, WritePostResultDto } from '../dto/write-post.dto';
import { PostAttachment, postSystemPrompt, postUserPrompt } from '../post-writer/post-prompt';

/** Sent inline, a picture must stay under the vision APIs' 20 MB request limit once base64-encoded. */
export const MAX_POST_PICTURE_BYTES = 10_000_000;

function attachmentOf(asset: MediaAsset | null): PostAttachment {
  if (!asset) return 'none';
  if (asset.type === MediaAssetType.IMAGE) return 'picture';
  if (asset.type === MediaAssetType.VIDEO || asset.type === MediaAssetType.CHARACTER)
    return 'video';
  throw new BadRequestException('Pick an image or a video from your Gallery.');
}

const tooLarge = () =>
  new BadRequestException(
    'That picture is too large for the AI to read (over 10 MB). Type a few words about it instead.',
  );

/**
 * "Write with AI" / "Improve with AI" in the post composer. With a Gallery image attached the model looks at the
 * picture itself and writes the post and hashtags from what it shows; a video is not watched, so its prompt stands
 * in. The picture is loaded by Gallery id from the caller's own workspace, never from an address the browser sends.
 * Free, like the studios' Improve with AI (decided 2026-10-21).
 */
@Injectable()
export class PostWriterService {
  private readonly logger = new Logger(PostWriterService.name);

  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly brandProfilesService: BrandProfilesService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async write(dto: WritePostDto, user: AuthenticatedUser): Promise<WritePostResultDto> {
    const asset = dto.mediaAssetId
      ? await this.mediaAssetsService.findForActor(dto.mediaAssetId, user)
      : null;
    const attachment = attachmentOf(asset);
    const draft = dto.draft?.trim() || undefined;
    const topic = dto.topic?.trim() || asset?.prompt?.trim() || undefined;
    if (attachment !== 'picture' && !draft && !topic) {
      throw new BadRequestException(
        'Type a few words about what you want to say, then press Write with AI.',
      );
    }
    const picture = attachment === 'picture' && asset ? await this.readPicture(asset) : null;

    const profiles = user.workspaceId
      ? await this.brandProfilesService.findByWorkspace(user.workspaceId)
      : [];
    const provider = this.providerFactory.getProviderFor({
      text: [draft, topic].filter(Boolean).join('\n'),
      withPictures: !!picture,
    });
    const result = await provider.generateText({
      systemPrompt: postSystemPrompt(buildBrandPromptParts(profiles[0] ?? null)),
      prompt: postUserPrompt({ platform: dto.platform, attachment, draft, topic }),
      images: picture ? [picture.image] : undefined,
      // Room to take in a busy picture before writing.
      maxTokens: picture ? 1200 : 1024,
      temperature: 0.6,
    });
    this.eventEmitter.emit(
      'ai.content-generated',
      new AIContentGeneratedEvent(result.provider, result.model, user.id),
    );

    const text = result.text.trim();
    if (!text) {
      throw new ServiceUnavailableException(
        'The AI did not write anything this time. Please try again.',
      );
    }
    return { text, readPicture: !!picture };
  }

  private async readPicture(asset: MediaAsset): Promise<PreparedPicture> {
    if (asset.sizeBytes > MAX_POST_PICTURE_BYTES) throw tooLarge();
    let bytes: Buffer;
    try {
      bytes = await this.storageService.readFile(asset.storageKey);
    } catch (err) {
      this.logger.error(
        `Could not read Gallery item ${asset.id} (${asset.storageKey}): ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Could not open that picture just now. Please try again.',
      );
    }
    if (bytes.length > MAX_POST_PICTURE_BYTES) throw tooLarge();
    return preparePicture(bytes);
  }
}
