import { BadRequestException, Logger } from '@nestjs/common';
import { AIProviderFactory } from './ai-provider.factory';

const named = (name: string) => ({ name, generateText: jest.fn(), healthCheck: jest.fn() });

function build(config: Record<string, string>) {
  const providers = {
    openai: named('openai'),
    gemini: named('gemini'),
    claude: named('claude'),
    openrouter: named('openrouter'),
    sarvam: named('sarvam'),
  };
  const factory = new AIProviderFactory(
    { get: (key: string) => config[key] } as never,
    providers.openai as never,
    providers.gemini as never,
    providers.claude as never,
    providers.openrouter as never,
    providers.sarvam as never,
  );
  return { factory, providers };
}

describe('AIProviderFactory.getProviderFor', () => {
  const configured = { 'ai.defaultProvider': 'gemini', 'ai.sarvam.apiKey': 'k' };

  it('sends Indian languages to Sarvam', () => {
    const { factory } = build(configured);
    for (const language of ['hindi', 'punjabi', 'hinglish', 'hi', 'Punjabi']) {
      expect(factory.getProviderFor({ language }).name).toBe('sarvam');
    }
  });

  it('sends English and unspecified work to the default provider', () => {
    const { factory } = build(configured);
    expect(factory.getProviderFor({ language: 'english' }).name).toBe('gemini');
    expect(factory.getProviderFor({}).name).toBe('gemini');
  });

  it('detects Indic script in the text when no language is given', () => {
    const { factory } = build(configured);
    expect(factory.getProviderFor({ text: 'नमस्ते, बीमा के बारे में बताइए' }).name).toBe('sarvam');
    expect(factory.getProviderFor({ text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' }).name).toBe('sarvam');
    expect(factory.getProviderFor({ text: 'Explain term insurance' }).name).toBe('gemini');
  });

  it('falls back to the default provider when Sarvam has no key', () => {
    const { factory } = build({ 'ai.defaultProvider': 'gemini' });
    expect(factory.getProviderFor({ language: 'hindi' }).name).toBe('gemini');
  });

  it('lets an explicit provider override the routing', () => {
    const { factory } = build(configured);
    expect(factory.getProviderFor({ provider: 'gemini', language: 'hindi' }).name).toBe('gemini');
    expect(() => factory.getProviderFor({ provider: 'nope' })).toThrow(BadRequestException);
  });
});

describe('AIProviderFactory backup writer', () => {
  const answer = (provider: string) => ({ content: 'ok from ' + provider, provider, model: 'm' });
  const outOfCredit = new Error(
    'The AI is temporarily unavailable on our side. Please try again later.',
  );

  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('lets OpenAI answer when the default Gemini fails', async () => {
    const { factory, providers } = build({
      'ai.defaultProvider': 'gemini',
      'ai.openai.apiKey': 'k',
    });
    providers.gemini.generateText.mockRejectedValue(outOfCredit);
    providers.openai.generateText.mockResolvedValue(answer('openai'));

    const provider = factory.getProviderFor({});
    expect(provider.name).toBe('gemini');
    await expect(
      provider.generateText({ prompt: 'Improve this', model: 'gemini-flash-latest' }),
    ).resolves.toEqual(answer('openai'));
    expect(providers.openai.generateText).toHaveBeenCalledWith({
      prompt: 'Improve this',
      model: undefined,
    });
    expect(provider.name).toBe('openai');
  });

  it('lets Gemini answer when the default OpenAI fails', async () => {
    const { factory, providers } = build({
      'ai.defaultProvider': 'openai',
      'ai.gemini.apiKey': 'k',
    });
    providers.openai.generateText.mockRejectedValue(outOfCredit);
    providers.gemini.generateText.mockResolvedValue(answer('gemini'));
    await expect(factory.getProviderFor({}).generateText({ prompt: 'x' })).resolves.toEqual(
      answer('gemini'),
    );
  });

  it('does not call the backup when the default answers', async () => {
    const { factory, providers } = build({
      'ai.defaultProvider': 'gemini',
      'ai.openai.apiKey': 'k',
    });
    providers.gemini.generateText.mockResolvedValue(answer('gemini'));
    await factory.getProviderFor({}).generateText({ prompt: 'x' });
    expect(providers.openai.generateText).not.toHaveBeenCalled();
  });

  it('has no backup when the other writer has no key', async () => {
    const { factory, providers } = build({ 'ai.defaultProvider': 'gemini' });
    providers.gemini.generateText.mockRejectedValue(outOfCredit);
    await expect(factory.getProviderFor({}).generateText({ prompt: 'x' })).rejects.toBe(
      outOfCredit,
    );
    expect(providers.openai.generateText).not.toHaveBeenCalled();
  });

  it('tries Sarvam, then the default, then the backup for Indian-language work', async () => {
    const { factory, providers } = build({
      'ai.defaultProvider': 'gemini',
      'ai.sarvam.apiKey': 'k',
      'ai.openai.apiKey': 'k',
    });
    providers.sarvam.generateText.mockRejectedValue(new Error('slow'));
    providers.gemini.generateText.mockRejectedValue(outOfCredit);
    providers.openai.generateText.mockResolvedValue(answer('openai'));
    await expect(
      factory.getProviderFor({ language: 'hindi' }).generateText({ prompt: 'x' }),
    ).resolves.toEqual(answer('openai'));
  });

  it('never adds a backup to an explicitly chosen provider', async () => {
    const { factory, providers } = build({
      'ai.defaultProvider': 'gemini',
      'ai.openai.apiKey': 'k',
    });
    providers.gemini.generateText.mockRejectedValue(outOfCredit);
    await expect(
      factory.getProviderFor({ provider: 'gemini' }).generateText({ prompt: 'x' }),
    ).rejects.toBe(outOfCredit);
    expect(providers.openai.generateText).not.toHaveBeenCalled();
  });
});
