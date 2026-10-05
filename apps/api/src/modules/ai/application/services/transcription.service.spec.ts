import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as never;
const audio = Buffer.from([1, 2, 3]);

describe('TranscriptionService', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  const service = () => new TranscriptionService(config({ 'ai.sarvam.apiKey': 'k' }));
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it('returns the transcript and the detected language', async () => {
    fetchMock.mockResolvedValue(ok({ transcript: ' नमस्ते ', language_code: 'hi-IN' }));

    await expect(service().transcribe(audio, 'audio/webm')).resolves.toEqual({ text: 'नमस्ते', language: 'hi-IN' });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('language_code')).toBe('unknown');
    expect(fetchMock.mock.calls[0][1].headers['api-subscription-key']).toBe('k');
  });

  it('passes an explicit language through', async () => {
    fetchMock.mockResolvedValue(ok({ transcript: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' }));

    await service().transcribe(audio, 'audio/webm', 'pa-IN');

    expect((fetchMock.mock.calls[0][1].body as FormData).get('language_code')).toBe('pa-IN');
  });

  it('reports a missing key as service-unavailable', async () => {
    await expect(new TranscriptionService(config({})).transcribe(audio, 'audio/webm')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects empty audio and empty transcripts clearly', async () => {
    await expect(service().transcribe(Buffer.alloc(0), 'audio/webm')).rejects.toBeInstanceOf(BadRequestException);
    fetchMock.mockResolvedValue(ok({ transcript: '  ' }));
    await expect(service().transcribe(audio, 'audio/webm')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps vendor failures to a retryable gateway error', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(service().transcribe(audio, 'audio/webm')).rejects.toBeInstanceOf(BadGatewayException);
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(service().transcribe(audio, 'audio/webm')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
