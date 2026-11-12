import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { DEFAULT_GOOGLE_VIDEO_MODEL, VeoProvider, videoDurationSeconds } from './veo.provider';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const config = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const finished = (content: unknown[]) => ({
  id: 'v1_abc',
  status: 'completed',
  steps: [{ type: 'user_input' }, { type: 'model_output', content }],
});

describe('VeoProvider (Google video, now Gemini Omni Flash)', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('asks for whole seconds from 3 to 15', () => {
    expect([undefined, 1, 4, 6, 8, 10, 15, 60].map(videoDurationSeconds)).toEqual([
      8, 3, 4, 6, 8, 10, 15, 15,
    ]);
  });

  it('starts a background interaction with Gemini Omni, the Gemini key in a header, never the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'v1_abc', status: 'in_progress' }));
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'gem-key' }));

    const result = await provider.submitJob({
      prompt: 'a calm lake',
      durationSeconds: 6,
      aspectRatio: '9:16',
      // An old request naming the retired Veo model must not reach Google.
      model: 'veo-3.1-fast-generate-preview',
    });

    expect(result).toEqual({
      provider: 'veo',
      model: DEFAULT_GOOGLE_VIDEO_MODEL,
      jobId: 'v1_abc',
      status: 'processing',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/interactions`);
    expect(url).not.toContain('gem-key');
    expect(init.headers['x-goog-api-key']).toBe('gem-key');
    expect(JSON.parse(init.body)).toEqual({
      model: 'gemini-omni-1.2-flash',
      input: 'a calm lake',
      response_format: { type: 'video', aspect_ratio: '9:16', duration: '6s' },
      background: true,
      store: true,
    });
  });

  it('uses GOOGLE_VIDEO_MODEL when it is set', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'v1_abc' }));
    const provider = new VeoProvider(
      config({ 'ai.gemini.apiKey': 'k', 'ai.video.veo.model': 'gemini-omni-2-flash' }),
    );
    await provider.submitJob({ prompt: 'x' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('gemini-omni-2-flash');
  });

  it('refuses when no key is configured', async () => {
    const provider = new VeoProvider(config({}));
    await expect(provider.submitJob({ prompt: 'x' })).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hides vendor detail from customers when Google rejects the request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { message: 'models/veo-3.1-fast-generate-preview is not found' } }, 404),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    await expect(provider.submitJob({ prompt: 'x' })).rejects.toThrow(
      /^Video generation is temporarily unavailable on our side.*no credits were used\.$/,
    );
  });

  it('says "busy" for Google quota limits', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: 'quota' } }, 429));
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));
    await expect(provider.submitJob({ prompt: 'x' })).rejects.toThrow(/busy/);
  });

  it('keeps polling while the interaction is running', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'v1_abc', status: 'in_progress' }));
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    expect((await provider.getJobStatus('v1_abc')).status).toBe('processing');
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/interactions/v1_abc`, expect.anything());
  });

  it('reports a finished clip, to be read from the interaction when it is saved', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(finished([{ type: 'video', mime_type: 'video/mp4', data: 'AAAA' }])),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    expect(await provider.getJobStatus('v1_abc')).toMatchObject({
      status: 'completed',
      videoUrl: `${BASE}/interactions/v1_abc`,
    });
  });

  it('reports a finished interaction with no video (safety rules) as failed, so it is refunded', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(finished([{ type: 'text', text: 'I cannot make that video.' }])),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));
    expect((await provider.getJobStatus('v1_abc')).status).toBe('failed');

    fetchMock.mockResolvedValue(jsonResponse({ id: 'v1_abc', status: 'failed' }));
    expect((await provider.getJobStatus('v1_abc')).status).toBe('failed');
  });

  it('refuses job ids that are not interaction ids before calling Google', async () => {
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));
    for (const bad of [
      'models/veo-3.1-fast-generate-preview/operations/a1b2c3',
      '../files',
      'v1_abc?alt=media',
      'v1_abc/../../models',
    ]) {
      await expect(provider.getJobStatus(bad)).rejects.toThrow('That is not a video job id.');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('decodes the clip that comes inside the interaction', async () => {
    const bytes = Buffer.from('fake-mp4-bytes');
    fetchMock.mockResolvedValue(
      jsonResponse(
        finished([{ type: 'video', mime_type: 'video/mp4', data: bytes.toString('base64') }]),
      ),
    );
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));

    const response = await provider.fetchVideo(`${BASE}/interactions/v1_abc`);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('video/mp4');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('fake-mp4-bytes');
  });

  it('downloads a clip delivered as a Google file, and never sends the key anywhere else', async () => {
    const provider = new VeoProvider(config({ 'ai.gemini.apiKey': 'k' }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(finished([{ type: 'video', uri: `${BASE}/files/abc:download?alt=media` }])),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await provider.fetchVideo(`${BASE}/interactions/v1_abc`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/files/abc:download?alt=media`);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(finished([{ type: 'video', uri: 'https://elsewhere.example/v.mp4' }])),
    );
    expect((await provider.fetchVideo(`${BASE}/interactions/v1_abc`)).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(provider.fetchVideo('https://elsewhere.example/v.mp4')).rejects.toThrow(
      'That is not a video address.',
    );
  });
});
