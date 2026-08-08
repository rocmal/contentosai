import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { VoiceService } from './voice.service';
import { VoiceProviderFactory } from '../../infrastructure/voice-provider.factory';
import {
  IVoiceProvider,
  VoiceGenerationResult,
} from '../../domain/interfaces/voice-provider.interface';
import { GenerateSpeechDto } from '../dto/generate-speech.dto';

describe('VoiceService', () => {
  let service: VoiceService;
  let edgeProvider: jest.Mocked<IVoiceProvider>;
  let providerFactory: jest.Mocked<VoiceProviderFactory>;
  let storageService: jest.Mocked<StorageService>;
  let mediaAssetsService: jest.Mocked<MediaAssetsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let creditsService: jest.Mocked<CreditsService>;

  const generationResult: VoiceGenerationResult = {
    provider: 'edge',
    model: 'en-US-AriaNeural',
    mimeType: 'audio/mpeg',
    audioBase64: 'ZmFrZS1tcDMtYnl0ZXM=',
  };

  // organizationId/workspaceId null - keeps the gallery-persistence branch a
  // no-op in tests that don't care about it, without needing to mock upload.
  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'jane@lumora.ai',
    organizationId: null,
    workspaceId: null,
    roles: [],
    permissions: [],
  };

  beforeEach(() => {
    edgeProvider = {
      name: 'edge',
      generateSpeech: jest.fn().mockResolvedValue(generationResult),
      listVoices: jest.fn().mockResolvedValue([{ id: 'en-US-AriaNeural', name: 'Aria' }]),
      healthCheck: jest.fn().mockResolvedValue(true),
    };

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(edgeProvider),
      listProviders: jest.fn().mockReturnValue(['edge', 'elevenlabs']),
    } as unknown as jest.Mocked<VoiceProviderFactory>;

    storageService = {
      uploadFile: jest.fn().mockResolvedValue({ key: 'gallery/voice/stub.mp3', url: 'https://cdn.example.com/stub.mp3' }),
      readFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    mediaAssetsService = {
      findCached: jest.fn().mockResolvedValue(null),
      saveGenerated: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MediaAssetsService>;

    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    creditsService = {
      reserve: jest.fn(),
      refund: jest.fn(),
    } as unknown as jest.Mocked<CreditsService>;

    service = new VoiceService(
      providerFactory,
      storageService,
      mediaAssetsService,
      eventEmitter,
      creditsService,
    );
  });

  describe('generateSpeech', () => {
    it('resolves the provider requested by the DTO and delegates synthesis to it', async () => {
      const dto: GenerateSpeechDto = {
        text: 'Hello from Lumora',
        provider: 'edge',
        voiceId: 'en-US-AriaNeural',
      };

      const result = await service.generateSpeech(dto, user);

      expect(providerFactory.getProvider).toHaveBeenCalledWith('edge');
      expect(mediaAssetsService.findCached).toHaveBeenCalledWith('user-1', expect.any(String));
      expect(edgeProvider.generateSpeech).toHaveBeenCalledWith({
        text: 'Hello from Lumora',
        voiceId: 'en-US-AriaNeural',
        model: undefined,
      });
      expect(result).toEqual(generationResult);
    });

    it('emits voice.generated with the resolved provider name', async () => {
      await service.generateSpeech({ text: 'Hello' }, user);

      expect(eventEmitter.emit).toHaveBeenCalledWith('voice.generated', {
        provider: 'edge',
        userId: 'user-1',
      });
    });

    it('lets the DTO omit provider so the factory applies the VOICE_PROVIDER default', async () => {
      await service.generateSpeech({ text: 'Hello' }, user);
      expect(providerFactory.getProvider).toHaveBeenCalledWith(undefined);
    });

    it('returns a cached result without calling the provider when one exists', async () => {
      mediaAssetsService.findCached.mockResolvedValueOnce({
        id: 'asset-1',
        storageKey: 'gallery/voice/cached.mp3',
        mimeType: 'audio/mpeg',
        provider: 'edge',
        model: 'en-US-AriaNeural',
      } as never);
      storageService.readFile.mockResolvedValueOnce(Buffer.from('cached-bytes'));

      const result = await service.generateSpeech({ text: 'Hello' }, user);

      expect(edgeProvider.generateSpeech).not.toHaveBeenCalled();
      expect(result.audioBase64).toEqual(Buffer.from('cached-bytes').toString('base64'));
      expect(creditsService.reserve).not.toHaveBeenCalled();
    });

    describe('credit charging (user with a workspace)', () => {
      const workspaceUser: AuthenticatedUser = {
        ...user,
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
      };

      it('reserves credits before calling the provider', async () => {
        await service.generateSpeech({ text: 'Hello from Lumora' }, workspaceUser);

        expect(creditsService.reserve).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-1',
            workspaceId: 'workspace-1',
            reason: 'generation.voice',
            userId: 'user-1',
          }),
        );
      });

      it('does not call the provider when reserving fails (insufficient credits)', async () => {
        creditsService.reserve.mockRejectedValueOnce(new Error('insufficient credits'));

        await expect(service.generateSpeech({ text: 'Hello' }, workspaceUser)).rejects.toThrow(
          'insufficient credits',
        );
        expect(edgeProvider.generateSpeech).not.toHaveBeenCalled();
      });

      it('refunds the reservation when the provider call fails', async () => {
        edgeProvider.generateSpeech.mockRejectedValueOnce(new Error('provider exploded'));

        await expect(service.generateSpeech({ text: 'Hello' }, workspaceUser)).rejects.toThrow(
          'provider exploded',
        );
        expect(creditsService.refund).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: 'org-1', workspaceId: 'workspace-1' }),
        );
      });
    });
  });

  describe('listVoices', () => {
    it('delegates to the resolved provider', async () => {
      const voices = await service.listVoices('edge');
      expect(providerFactory.getProvider).toHaveBeenCalledWith('edge');
      expect(voices).toEqual([{ id: 'en-US-AriaNeural', name: 'Aria' }]);
    });
  });

  describe('getProviderStatuses', () => {
    it('runs a health check against every registered provider', async () => {
      const statuses = await service.getProviderStatuses();

      expect(providerFactory.listProviders).toHaveBeenCalled();
      expect(statuses).toEqual([
        { name: 'edge', available: true },
        { name: 'elevenlabs', available: true },
      ]);
    });
  });

  describe('listProviders', () => {
    it('delegates to the factory', () => {
      expect(service.listProviders()).toEqual(['edge', 'elevenlabs']);
    });
  });
});
