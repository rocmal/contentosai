import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from './ai.service';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { MockAIProvider } from '../../infrastructure/providers/__tests__/mock-ai-provider';
import { GenerateContentDto } from '../dto/generate-content.dto';

describe('AiService', () => {
  let service: AiService;
  let mockProvider: MockAIProvider;
  let providerFactory: jest.Mocked<AIProviderFactory>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    mockProvider = new MockAIProvider('openai');
    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      listProviders: jest.fn().mockReturnValue(['openai', 'gemini', 'claude', 'openrouter']),
    } as unknown as jest.Mocked<AIProviderFactory>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new AiService(providerFactory, eventEmitter);
  });

  it('delegates generation to the provider resolved by the factory', async () => {
    const dto: GenerateContentDto = { prompt: 'Write a tagline', provider: 'openai' };

    const result = await service.generateText(dto, 'user-1');

    expect(providerFactory.getProvider).toHaveBeenCalledWith('openai');
    expect(mockProvider.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Write a tagline' }),
    );
    expect(result.text).toContain('Write a tagline');
  });

  it('emits an ai.content-generated event after a successful generation', async () => {
    await service.generateText({ prompt: 'Hello' }, 'user-1');

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ai.content-generated',
      expect.objectContaining({ provider: 'openai', userId: 'user-1' }),
    );
  });

  it('lists every registered provider', () => {
    expect(service.listProviders()).toEqual(['openai', 'gemini', 'claude', 'openrouter']);
  });

  describe('getProviderStatuses', () => {
    it('runs a health check against every registered provider', async () => {
      const statuses = await service.getProviderStatuses();

      expect(providerFactory.listProviders).toHaveBeenCalled();
      expect(statuses).toEqual([
        { name: 'openai', available: true },
        { name: 'gemini', available: true },
        { name: 'claude', available: true },
        { name: 'openrouter', available: true },
      ]);
    });

    it('reflects a provider that is not configured', async () => {
      mockProvider.healthCheck.mockResolvedValueOnce(false);

      const statuses = await service.getProviderStatuses();

      expect(statuses[0]).toEqual({ name: 'openai', available: false });
    });
  });
});
