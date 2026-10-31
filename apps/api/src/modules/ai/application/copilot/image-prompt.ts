import { IMAGE_ASPECT_RATIOS, ImageAspectRatio } from '@modules/image/domain/image-formats';

/** The line the Co-pilot is told to end with when the person wants a picture made. Models sometimes dress it in
 * Markdown (**IMAGE_PROMPT:**, a heading or a list dash), so those are allowed around it. */
const MARKER = /(?:^|\n)[ \t>*_`#-]*IMAGE[ _]PROMPT[*_` \t]*:[*_` \t]*/i;

/** Splits a Co-pilot answer into the words to show and the ready-made image prompt, if it wrote one. */
export function splitImagePrompt(text: string): { reply: string; imagePrompt?: string } {
  const match = MARKER.exec(text);
  if (!match) return { reply: text.trim() };
  const imagePrompt = text
    .slice(match.index + match[0].length)
    .trim()
    .replace(/^[*_`"“]+|[*_`"”]+$/g, '')
    .trim();
  const reply = text.slice(0, match.index).trim();
  if (!imagePrompt) return { reply: reply || text.trim() };
  return { reply: reply || 'Here is a prompt for a picture like that.', imagePrompt };
}

/** The Image Studio shape nearest to a picture's own, so "something like this" keeps its shape. */
export function closestAspectRatio(width: number, height: number): ImageAspectRatio | undefined {
  if (!width || !height) return undefined;
  const target = Math.log(width / height);
  const distance = (ratio: ImageAspectRatio) => {
    const [w, h] = ratio.split(':').map(Number);
    return Math.abs(Math.log(w / h) - target);
  };
  return IMAGE_ASPECT_RATIOS.reduce((best, ratio) =>
    distance(ratio) < distance(best) ? ratio : best,
  );
}
