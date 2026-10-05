import { ServiceUnavailableException } from '@nestjs/common';
import { FallbackAIProvider } from './fallback-ai-provider';

const provider = (name: string, impl: jest.Mock) => ({ name, generateText: impl, healthCheck: jest.fn() });

describe('FallbackAIProvider', () => {
  it('uses the primary when it works', async () => {
    const primary = jest.fn().mockResolvedValue({ text: 'नमस्ते', provider: 'sarvam', model: 'm' });
    const backup = jest.fn();
    const p = new FallbackAIProvider(provider('sarvam', primary), provider('gemini', backup));

    await expect(p.generateText({ prompt: 'x' })).resolves.toMatchObject({ provider: 'sarvam' });
    expect(backup).not.toHaveBeenCalled();
    expect(p.name).toBe('sarvam');
  });

  it('falls back to the backup (without the vendor-specific model) when the primary fails', async () => {
    const primary = jest.fn().mockRejectedValue(new ServiceUnavailableException('slow'));
    const backup = jest.fn().mockResolvedValue({ text: 'hello', provider: 'gemini', model: 'g' });
    const p = new FallbackAIProvider(provider('sarvam', primary), provider('gemini', backup));

    const result = await p.generateText({ prompt: 'x', model: 'sarvam-105b' });

    expect(result.provider).toBe('gemini');
    expect(backup).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'x', model: undefined }));
    expect(p.name).toBe('gemini');
  });

  it('surfaces the primary error when both fail', async () => {
    const primaryError = new ServiceUnavailableException('sarvam down');
    const p = new FallbackAIProvider(
      provider('sarvam', jest.fn().mockRejectedValue(primaryError)),
      provider('gemini', jest.fn().mockRejectedValue(new Error('gemini down'))),
    );

    await expect(p.generateText({ prompt: 'x' })).rejects.toBe(primaryError);
    expect(p.name).toBe('sarvam');
  });
});
