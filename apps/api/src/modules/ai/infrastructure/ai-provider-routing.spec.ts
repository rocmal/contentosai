import { BadRequestException } from '@nestjs/common';
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
