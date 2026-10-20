import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { BaseAIProvider } from './base-ai-provider';

class TestProvider extends BaseAIProvider {
  call(timeoutMs?: number): Promise<{ ok: boolean }> {
    return this.postJson<{ ok: boolean }>(
      'https://vendor.example/generate',
      { prompt: 'x' },
      {},
      timeoutMs,
    );
  }
}

const VENDOR_REPLY = JSON.stringify({
  error: {
    code: 402,
    message: 'Your prepayment credits are depleted.',
    status: 'RESOURCE_EXHAUSTED',
  },
});

describe('BaseAIProvider', () => {
  const fetchMock = jest.fn();
  const provider = new TestProvider();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns the vendor JSON on success', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(provider.call()).resolves.toEqual({ ok: true });
  });

  it('logs the vendor reply but never shows it to the customer', async () => {
    fetchMock.mockResolvedValue(new Response(VENDOR_REPLY, { status: 402 }));
    const error = await provider.call().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const message = (error as Error).message;
    expect(message).toBe('The AI is temporarily unavailable on our side. Please try again later.');
    expect(message).not.toMatch(/prepayment|402|TestProvider/);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('prepayment credits are depleted'),
    );
  });

  it('says "busy" for a rate limit', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"quota"}', { status: 429 }));
    await expect(provider.call()).rejects.toThrow(
      'The AI is busy right now. Please try again in a few minutes.',
    );
  });

  it('hides network errors and the provider name', async () => {
    fetchMock.mockRejectedValue(new TypeError('getaddrinfo ENOTFOUND vendor.example'));
    await expect(provider.call()).rejects.toThrow(
      'The AI could not be reached just now. Please try again in a minute.',
    );
  });

  it('gives a plain message when the vendor is too slow', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));
    await expect(provider.call(25_000)).rejects.toThrow(
      'The AI took longer than 25 seconds to answer. Please try again.',
    );
  });
});
