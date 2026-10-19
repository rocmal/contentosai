import { isMachineMadeName, nameFromLatePrompt } from './friendly-name';

describe('nameFromLatePrompt', () => {
  it('replaces the dated placeholder with a name from the prompt', () => {
    // Six words at most, as for every generated name.
    expect(nameFromLatePrompt('Video 19 Oct 2026.mp4', 'A quiet lake at dawn, cinematic')).toBe(
      'A quiet lake at dawn cinematic.mp4',
    );
  });

  it('keeps the copy number of a second image', () => {
    expect(nameFromLatePrompt('Image 19 Oct 2026 (2).png', 'Diwali diyas on a balcony')).toBe(
      'Diwali diyas on a balcony (2).png',
    );
  });

  it('leaves names that are not placeholders, and prompts with no words', () => {
    expect(nameFromLatePrompt('Diwali offer.mp4', 'A quiet lake')).toBeNull();
    expect(nameFromLatePrompt('Video 19 Oct 2026.mp4', '!!!')).toBeNull();
  });
});

describe('isMachineMadeName', () => {
  it('spots ids and timestamps', () => {
    expect(isMachineMadeName('817ed7e3-767a-4a23-9149-9935e99c350e')).toBe(true);
    expect(isMachineMadeName('video-c40565c6-4f98-4806-822d-6cddabfc35ef')).toBe(true);
    expect(isMachineMadeName('lumora-video-1760882400000')).toBe(true);
  });

  it('leaves names a person or a phone gave', () => {
    expect(isMachineMadeName('LIC plan')).toBe(false);
    expect(isMachineMadeName('IMG_20261012_101112')).toBe(false);
    expect(isMachineMadeName('WhatsApp Image 2026-10-12 at 10.11.12')).toBe(false);
  });
});
