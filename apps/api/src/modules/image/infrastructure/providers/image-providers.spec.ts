import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { OpenAIImageProvider } from './openai-image.provider';
import { StabilityProvider } from './stability.provider';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function config(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as never;
}

describe('OpenAIImageProvider', () => {
  let fetchMock: FetchMock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  const provider = () => new OpenAIImageProvider(config({ 'ai.image.openai.apiKey': 'sk-test' }));

  it('asks gpt-image-2 for the exact shape and tier, and never sends response_format', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ b64_json: 'AAAA' }] }));

    const result = await provider().generateImage({ prompt: 'a cat', aspectRatio: '16:9', quality: 'draft' });

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.model).toBe('gpt-image-2');
    expect(body.quality).toBe('low');
    expect(body.size).toMatch(/^\d+x\d+$/);
    expect(body).not.toHaveProperty('response_format');
    expect(result.images).toEqual(['data:image/jpeg;base64,AAAA']);
  });

  it('uses the model configured in OPENAI_IMAGE_MODEL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ b64_json: 'AAAA' }] }));
    const p = new OpenAIImageProvider(
      config({ 'ai.image.openai.apiKey': 'sk-test', 'ai.image.openai.model': 'gpt-image-9' }),
    );

    await p.generateImage({ prompt: 'a cat' });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).model).toBe('gpt-image-9');
  });

  it('retries once with a standard size if the custom size is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Invalid value for size' } }, 400))
      .mockResolvedValueOnce(jsonResponse({ data: [{ b64_json: 'BBBB' }] }));

    const result = await provider().generateImage({ prompt: 'a cat', aspectRatio: '9:16' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string).size).toBe('1024x1536');
    expect(result.images).toHaveLength(1);
  });

  it('turns a content-policy refusal into a clear, non-retryable message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: 'Blocked by the safety system' } }, 400));

    await expect(provider().generateImage({ prompt: 'x', aspectRatio: '1:1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reports vendor outages and a missing key as service-unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: 'boom' } }, 500));
    await expect(provider().generateImage({ prompt: 'x' })).rejects.toBeInstanceOf(ServiceUnavailableException);

    const unconfigured = new OpenAIImageProvider(config({}));
    await expect(unconfigured.generateImage({ prompt: 'x' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('StabilityProvider', () => {
  let fetchMock: FetchMock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  const provider = () => new StabilityProvider(config({ 'ai.image.stability.apiKey': 'sk-test' }));
  const okImage = () => jsonResponse({ image: 'CCCC', finish_reason: 'SUCCESS' });

  it('sends the aspect ratio (it used to ignore it) and uses Core for standard', async () => {
    fetchMock.mockImplementation(async () => okImage());

    await provider().generateImage({ prompt: 'a cat', aspectRatio: '4:5', quality: 'standard' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/generate/core');
    const form = init?.body as FormData;
    expect(form.get('aspect_ratio')).toBe('4:5');
    expect(form.get('prompt')).toBe('a cat');
  });

  it('uses Ultra for the high tier', async () => {
    fetchMock.mockImplementation(async () => okImage());

    await provider().generateImage({ prompt: 'a cat', aspectRatio: '1:1', quality: 'high' });

    expect(fetchMock.mock.calls[0][0]).toContain('/generate/ultra');
  });

  it('generates the requested count (it used to return one and charge for all)', async () => {
    fetchMock.mockImplementation(async () => okImage());

    const result = await provider().generateImage({ prompt: 'a cat', aspectRatio: '1:1', count: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.images).toHaveLength(3);
  });

  it('maps an explicit size to the nearest supported ratio', async () => {
    fetchMock.mockImplementation(async () => okImage());

    await provider().generateImage({ prompt: 'a cat', size: '1792x1024' });

    expect((fetchMock.mock.calls[0][1]?.body as FormData).get('aspect_ratio')).toBe('16:9');
  });

  it('treats a filtered image as a refundable, non-retryable failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ image: 'CCCC', finish_reason: 'CONTENT_FILTERED' }));

    await expect(provider().generateImage({ prompt: 'x', aspectRatio: '1:1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
