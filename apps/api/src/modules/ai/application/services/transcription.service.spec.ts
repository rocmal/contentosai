import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { speechUpload, TranscriptionService } from './transcription.service';

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
describe('speechUpload', () => {
  it('names phone recordings (AAC in MP4) as mp4 so Sarvam decodes them', () => {
    expect(speechUpload('audio/m4a')).toEqual({ name: 'speech.mp4', type: 'audio/mp4' });
    expect(speechUpload('audio/x-m4a')).toEqual({ name: 'speech.mp4', type: 'audio/mp4' });
    expect(speechUpload('audio/mp4')).toEqual({ name: 'speech.mp4', type: 'audio/mp4' });
    expect(speechUpload('audio/aac')).toEqual({ name: 'speech.mp4', type: 'audio/mp4' });
  });

  it('keeps browser WebM recordings as they are', () => {
    expect(speechUpload('audio/webm;codecs=opus')).toEqual({ name: 'speech.webm', type: 'audio/webm;codecs=opus' });
    expect(speechUpload('video/webm')).toEqual({ name: 'speech.webm', type: 'video/webm' });
  });

  it('falls back to WebM when the type is missing or not audio', () => {
    expect(speechUpload(undefined)).toEqual({ name: 'speech.webm', type: 'audio/webm' });
    expect(speechUpload('application/octet-stream')).toEqual({ name: 'speech.webm', type: 'audio/webm' });
  });

  it('maps mp3, wav and ogg', () => {
    expect(speechUpload('audio/mpeg').name).toBe('speech.mp3');
    expect(speechUpload('audio/wav').name).toBe('speech.wav');
    expect(speechUpload('audio/ogg').name).toBe('speech.ogg');
  });
});
