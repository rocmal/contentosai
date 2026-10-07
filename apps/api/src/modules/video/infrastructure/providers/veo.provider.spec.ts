import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { VeoProvider, veoDurationSeconds } from './veo.provider';

const config = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

describe('VeoProvider', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('snaps requested lengths to the 4, 6 or 8 seconds Veo supports', () => {
    expect([undefined, 3, 4, 5, 6, 7, 10].map(veoDurationSeconds)).toEqual([4, 4, 4, 6, 6, 8, 8]);
  });

  it('falls back to the Gemini key and sends it as a header, never in the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ name: 'operations/abc' }));
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'gem-key' }));

    const result = await provider.submitJob({ prompt: 'a calm lake', durationSeconds: 5 });

    expect(result).toMatchObject({
      provider: 'veo',
      jobId: 'operations/abc',
      status: 'processing',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('gem-key');
    expect(init.headers['x-goog-api-key']).toBe('gem-key');
    expect(JSON.parse(init.body).parameters.durationSeconds).toBe(6);
  });

  it('refuses when no key is configured', async () => {
    const provider = new VeoProvider(config({}));
    await expect(provider.submitJob({ prompt: 'x' })).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hides vendor detail from customers when Google rejects the request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { message: 'API key AIza... invalid' } }, 403),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    await expect(provider.submitJob({ prompt: 'x' })).rejects.toThrow(
      /temporarily unavailable.*no credits were used/,
    );
  });

  it('reads the finished video from the current response shape', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        name: 'operations/abc',
        done: true,
        response: {
          generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://files/v.mp4' } }] },
        },
      }),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    expect(await provider.getJobStatus('operations/abc')).toMatchObject({
      status: 'completed',
      videoUrl: 'https://files/v.mp4',
    });
  });

  it('reports a finished job with no video (safety filter) as failed', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        done: true,
        response: { generateVideoResponse: { raiMediaFilteredReasons: ['blocked'] } },
      }),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    expect((await provider.getJobStatus('operations/abc')).status).toBe('failed');
  });
});
