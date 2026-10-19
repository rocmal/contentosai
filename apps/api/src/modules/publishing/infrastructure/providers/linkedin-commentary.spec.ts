import { toLinkedInCommentary } from './linkedin-commentary';

describe('toLinkedInCommentary', () => {
  it('escapes the characters LinkedIn reads as markup', () => {
    expect(toLinkedInCommentary('Term plan (20 years) <for you> @ ₹500*')).toBe(
      'Term plan \\(20 years\\) \\<for you\\> \\@ ₹500\\*',
    );
  });

  it('keeps hashtags as hashtags, in any script', () => {
    expect(toLinkedInCommentary('Secure your family #LIC #बीमा')).toBe(
      'Secure your family {hashtag|\\#|LIC} {hashtag|\\#|बीमा}',
    );
    expect(toLinkedInCommentary('#Insurance first')).toBe('{hashtag|\\#|Insurance} first');
  });

  it('escapes a # that is not a hashtag', () => {
    expect(toLinkedInCommentary('Plan#2 and # alone')).toBe('Plan\\#2 and \\# alone');
  });

  it('leaves plain text and line breaks alone', () => {
    expect(toLinkedInCommentary('Hello!\n\nPlan today.')).toBe('Hello!\n\nPlan today.');
  });
});
