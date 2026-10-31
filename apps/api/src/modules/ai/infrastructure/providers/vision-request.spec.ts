import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIGenerationRequest } from '../../domain/interfaces/ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { SarvamProvider } from './sarvam.provider';

const config = {
  get: (key: string) =>
    ({ 'ai.gemini.apiKey': 'g-key', 'ai.openai.apiKey': 'o-key', 'ai.sarvam.apiKey': 's-key' })[
      key
    ],
} as unknown as ConfigService;

const withPicture: AIGenerationRequest = {
  prompt: 'What is this?',
  images: [{ mimeType: 'image/png', base64: 'cG5n' }],
};

describe('pictures in provider requests', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

  it('Gemini gets the picture as inline data before the text', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A chart' }] } }] })),
    );
    await expect(new GeminiProvider(config).generateText(withPicture)).resolves.toMatchObject({
      text: 'A chart',
    });
    expect(sentBody().contents[0].parts).toEqual([
      { inlineData: { mimeType: 'image/png', data: 'cG5n' } },
      { text: 'What is this?' },
    ]);
  });

  it('OpenAI gets the picture as a data URL beside the text, and plain text stays a string', async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ model: 'gpt-4o-mini', choices: [{ message: { content: 'A chart' } }] }),
        ),
    );
    const provider = new OpenAIProvider(config);

    await provider.generateText(withPicture);
    expect(sentBody().messages[0].content).toEqual([
      { type: 'text', text: 'What is this?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,cG5n' } },
    ]);

    fetchMock.mockClear();
    await provider.generateText({ prompt: 'Hello' });
    expect(sentBody().messages[0].content).toBe('Hello');
  });

  it('a text-only provider refuses pictures instead of answering blind', async () => {
    await expect(new SarvamProvider(config).generateText(withPicture)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
