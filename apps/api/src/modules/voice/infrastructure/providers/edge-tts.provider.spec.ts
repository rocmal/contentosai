import { ServiceUnavailableException } from '@nestjs/common';
import { Readable } from 'stream';
import { MsEdgeTTS } from 'msedge-tts';
import { EdgeTTSProvider } from './edge-tts.provider';

jest.mock('msedge-tts', () => ({
  OUTPUT_FORMAT: { AUDIO_24KHZ_96KBITRATE_MONO_MP3: 'audio-24khz-96kbitrate-mono-mp3' },
  MsEdgeTTS: jest.fn(),
}));

const MockedMsEdgeTTS = MsEdgeTTS as jest.MockedClass<typeof MsEdgeTTS>;

const SAMPLE_VOICES = [
  {
    Name: 'Microsoft Aria Online (Natural) - English (United States)',
    ShortName: 'en-US-AriaNeural',
    Gender: 'Female',
    Locale: 'en-US',
    SuggestedCodec: 'audio-24khz-48kbitrate-mono-mp3',
    FriendlyName: 'Microsoft Aria Online (Natural) - English (United States)',
    Status: 'GA',
  },
];

function mockClientInstance(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    setMetadata: jest.fn().mockResolvedValue(undefined),
    toStream: jest.fn().mockReturnValue({
      audioStream: Readable.from([Buffer.from('fake-mp3-bytes')]),
      metadataStream: null,
    }),
    getVoices: jest.fn().mockResolvedValue(SAMPLE_VOICES),
    close: jest.fn(),
    ...overrides,
  };
}

describe('EdgeTTSProvider', () => {
  let provider: EdgeTTSProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    MockedMsEdgeTTS.mockImplementation(() => mockClientInstance() as never);
    provider = new EdgeTTSProvider();
  });

  it('is registered under the "edge" provider name', () => {
    expect(provider.name).toBe('edge');
  });

  describe('generateSpeech', () => {
    it('returns base64-encoded mp3 audio synthesised with the requested voice', async () => {
      const result = await provider.generateSpeech({
        text: 'Hello from Lumora',
        voiceId: 'en-US-AriaNeural',
      });

      expect(result.provider).toBe('edge');
      expect(result.model).toBe('en-US-AriaNeural');
      expect(result.mimeType).toBe('audio/mpeg');
      expect(Buffer.from(result.audioBase64, 'base64').toString('utf8')).toBe('fake-mp3-bytes');
    });

    it('falls back to a default voice when none is provided', async () => {
      const result = await provider.generateSpeech({ text: 'Hello' });
      expect(result.model).toBe('en-US-AriaNeural');
    });

    it('closes the client connection even when synthesis fails', async () => {
      const client = mockClientInstance({
        setMetadata: jest.fn().mockRejectedValue(new Error('voice not found')),
      });
      MockedMsEdgeTTS.mockImplementation(() => client as never);

      await expect(provider.generateSpeech({ text: 'Hello' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(client.close).toHaveBeenCalled();
    });
  });

  describe('listVoices', () => {
    it('maps Edge TTS voices into the common VoiceInfo shape', async () => {
      const voices = await provider.listVoices();
      expect(voices).toEqual([
        {
          id: 'en-US-AriaNeural',
          name: 'Microsoft Aria Online (Natural) - English (United States)',
          locale: 'en-US',
          gender: 'Female',
        },
      ]);
    });

    it('returns an empty list instead of throwing when the service is unreachable', async () => {
      MockedMsEdgeTTS.mockImplementation(
        () =>
          mockClientInstance({
            getVoices: jest.fn().mockRejectedValue(new Error('down')),
          }) as never,
      );

      await expect(provider.listVoices()).resolves.toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('returns true when voices can be fetched', async () => {
      await expect(provider.healthCheck()).resolves.toBe(true);
    });

    it('returns false when Edge TTS is unreachable', async () => {
      MockedMsEdgeTTS.mockImplementation(
        () =>
          mockClientInstance({
            getVoices: jest.fn().mockRejectedValue(new Error('down')),
          }) as never,
      );

      await expect(provider.healthCheck()).resolves.toBe(false);
    });
  });
});
