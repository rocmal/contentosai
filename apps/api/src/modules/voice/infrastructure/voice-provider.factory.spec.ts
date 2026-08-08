import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceProviderFactory } from './voice-provider.factory';
import { IVoiceProvider } from '../domain/interfaces/voice-provider.interface';

function fakeProvider(name: string): IVoiceProvider {
  return {
    name,
    generateSpeech: jest.fn(),
    listVoices: jest.fn(),
    healthCheck: jest.fn(),
  };
}

describe('VoiceProviderFactory', () => {
  const edge = fakeProvider('edge');
  const elevenlabs = fakeProvider('elevenlabs');
  const cartesia = fakeProvider('cartesia');
  const azure = fakeProvider('azure');
  const piper = fakeProvider('piper');

  function buildFactory(defaultProvider: string | undefined) {
    const configService = {
      get: jest.fn().mockReturnValue(defaultProvider),
    } as unknown as ConfigService;

    return new VoiceProviderFactory(
      configService,
      edge as never,
      elevenlabs as never,
      cartesia as never,
      azure as never,
      piper as never,
    );
  }

  it('lists every registered provider, edge included', () => {
    const factory = buildFactory('edge');
    expect(factory.listProviders().sort()).toEqual(
      ['azure', 'cartesia', 'edge', 'elevenlabs', 'piper'].sort(),
    );
  });

  it('resolves an explicitly requested provider', () => {
    const factory = buildFactory('edge');
    expect(factory.getProvider('azure')).toBe(azure);
  });

  it('falls back to VOICE_PROVIDER (edge) when no provider is requested', () => {
    const factory = buildFactory('edge');
    expect(factory.getProvider(undefined)).toBe(edge);
  });

  it('honors a non-default VOICE_PROVIDER configuration', () => {
    const factory = buildFactory('elevenlabs');
    expect(factory.getProvider(undefined)).toBe(elevenlabs);
  });

  it('throws BadRequestException for an unknown provider name', () => {
    const factory = buildFactory('edge');
    expect(() => factory.getProvider('does-not-exist')).toThrow(BadRequestException);
  });
});
