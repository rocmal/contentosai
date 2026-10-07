import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { VoiceProviderFactory } from '@modules/voice/infrastructure/voice-provider.factory';
import { CustomVoice } from '../../domain/entities/custom-voice.entity';
import {
  CUSTOM_VOICES_REPOSITORY,
  ICustomVoicesRepository,
} from '../../domain/repositories/custom-voice-repository.interface';

/** Cloning is the one provider feature voices recorded here need. */
const CLONING_PROVIDER = 'elevenlabs';
/** Per workspace - the vendor limits how many cloned voices an account may hold. */
export const MAX_CUSTOM_VOICES_PER_WORKSPACE = 10;
/** Below this a recording is certainly too short to clone from (about 30 s of compressed audio is larger). */
export const MIN_RECORDING_BYTES = 30_000;

export interface RecordingFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class CustomVoicesService {
  private readonly logger = new Logger(CustomVoicesService.name);

  constructor(
    @Inject(CUSTOM_VOICES_REPOSITORY) private readonly repository: ICustomVoicesRepository,
    private readonly voiceProviderFactory: VoiceProviderFactory,
    private readonly storageService: StorageService,
  ) {}

  async create(
    user: AuthenticatedUser,
    name: string,
    consent: boolean,
    file: RecordingFile,
  ): Promise<CustomVoice> {
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException(
        'Your account is not attached to an organization workspace yet.',
      );
    }
    if (!consent) {
      throw new BadRequestException(
        'Please confirm that this recording is your own voice, or that you have permission to use it.',
      );
    }
    if (!file.buffer || file.buffer.length < MIN_RECORDING_BYTES) {
      throw new BadRequestException(
        'That recording is too short. Record at least 30 seconds of clear speech.',
      );
    }

    const existing = await this.repository.findAll({
      limit: 200,
      filters: { workspaceId: user.workspaceId },
    });
    if (existing.items.length >= MAX_CUSTOM_VOICES_PER_WORKSPACE) {
      throw new BadRequestException(
        `You can keep up to ${MAX_CUSTOM_VOICES_PER_WORKSPACE} recorded voices. Delete one to add another.`,
      );
    }
    if (existing.items.some((voice) => voice.name.toLowerCase() === name.toLowerCase())) {
      throw new ConflictException(
        `You already have a voice named "${name}". Pick a different name.`,
      );
    }

    const provider = this.voiceProviderFactory.getProvider(CLONING_PROVIDER);
    if (!provider.cloneVoice || !(await provider.healthCheck())) {
      throw new ServiceUnavailableException(
        'Recording your own voice is not set up on this server yet (the voice cloning service is not configured).',
      );
    }

    const providerVoiceId = await provider.cloneVoice({
      name,
      audio: file.buffer,
      mimeType: file.mimetype,
    });

    try {
      // Keeping the sample lets the clone be rebuilt if it is ever lost at the provider.
      let sampleStorageKey: string | null = null;
      try {
        sampleStorageKey = (await this.storageService.uploadFile(file, 'custom-voices')).key;
      } catch (err) {
        this.logger.warn(`Could not store the voice sample: ${(err as Error).message}`);
      }

      return await this.repository.create(
        {
          organizationId: user.organizationId,
          workspaceId: user.workspaceId,
          name,
          provider: CLONING_PROVIDER,
          providerVoiceId,
          sampleStorageKey,
          consentConfirmedAt: new Date(),
        },
        user.id,
      );
    } catch (err) {
      // Do not leave an orphaned clone (it counts against the provider's voice slots).
      await provider.deleteVoice?.(providerVoiceId).catch(() => undefined);
      throw err;
    }
  }

  async list(workspaceId: string | null): Promise<CustomVoice[]> {
    if (!workspaceId) return [];
    const result = await this.repository.findAll({
      limit: 200,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      filters: { workspaceId },
    });
    return result.items;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const voice = await this.repository.findById(id);
    if (!voice || voice.workspaceId !== user.workspaceId) {
      throw new NotFoundException(`Voice "${id}" not found`);
    }
    if (voice.createdBy !== user.id) {
      throw new ForbiddenException('Only the person who recorded this voice can delete it');
    }

    const provider = this.voiceProviderFactory.getProvider(voice.provider);
    await provider.deleteVoice?.(voice.providerVoiceId).catch((err) => {
      // The row is removed regardless; a leftover remote clone is logged for cleanup.
      this.logger.warn(
        `Could not delete the ${voice.provider} voice ${voice.providerVoiceId}: ${err.message}`,
      );
    });
    if (voice.sampleStorageKey) {
      await this.storageService.delete(voice.sampleStorageKey).catch(() => undefined);
    }
    await this.repository.delete(id, user.id);
  }
}
