import { closestAspectRatio, splitImagePrompt } from './image-prompt';

describe('splitImagePrompt', () => {
  it('takes the image prompt off the end of the reply', () => {
    const answer =
      'I will make a portrait infographic comparing two plans.\nIMAGE_PROMPT: A clean 4:5 infographic titled "Term vs Endowment".';
    expect(splitImagePrompt(answer)).toEqual({
      reply: 'I will make a portrait infographic comparing two plans.',
      imagePrompt: 'A clean 4:5 infographic titled "Term vs Endowment".',
    });
  });

  it('accepts the marker dressed in Markdown and strips quotes around the prompt', () => {
    expect(
      splitImagePrompt('Here goes.\n\n**IMAGE_PROMPT:** "A sunrise over the Golden Temple"'),
    ).toEqual({
      reply: 'Here goes.',
      imagePrompt: 'A sunrise over the Golden Temple',
    });
    expect(splitImagePrompt('- Image prompt: A family on a scooter').imagePrompt).toBe(
      'A family on a scooter',
    );
  });

  it('keeps a prompt that runs over several lines', () => {
    expect(
      splitImagePrompt('Sure.\nIMAGE_PROMPT: Top: a heading.\nBottom: three icons.').imagePrompt,
    ).toBe('Top: a heading.\nBottom: three icons.');
  });

  it('leaves ordinary answers alone', () => {
    expect(splitImagePrompt('  Five hooks:\n- One\n- Two  ')).toEqual({
      reply: 'Five hooks:\n- One\n- Two',
    });
    expect(splitImagePrompt('Done.\nIMAGE_PROMPT:   ')).toEqual({ reply: 'Done.' });
  });

  it('still says something when the answer is only a prompt', () => {
    expect(splitImagePrompt('IMAGE_PROMPT: A poster').reply).toBe(
      'Here is a prompt for a picture like that.',
    );
  });
});

describe('closestAspectRatio', () => {
  it.each([
    [800, 1000, '4:5'],
    [1080, 1080, '1:1'],
    [1920, 1080, '16:9'],
    [1080, 1920, '9:16'],
    [1000, 1500, '2:3'],
    [1200, 627, '16:9'],
  ])('maps %ix%i to %s', (width, height, ratio) => {
    expect(closestAspectRatio(width, height)).toBe(ratio);
  });

  it('gives nothing when the size is unknown', () => {
    expect(closestAspectRatio(0, 0)).toBeUndefined();
  });
});
