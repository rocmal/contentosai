/** Aspect ratios Image Studio generates natively. Every platform format in the
 * app maps onto one of these (e.g. a 1.91:1 link post is generated as 16:9 and
 * trimmed slightly), so a multi-platform request costs one generation per
 * distinct ratio instead of one per platform. All five are accepted as-is by
 * Stability's `aspect_ratio` parameter and are expressible as OpenAI sizes. */
export const IMAGE_ASPECT_RATIOS = ['1:1', '4:5', '16:9', '9:16', '2:3'] as const;
export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

export const IMAGE_QUALITIES = ['draft', 'standard', 'high'] as const;
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

const RATIO_VALUE: Record<ImageAspectRatio, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '2:3': 2 / 3,
};

/** gpt-image models accept custom `WIDTHxHEIGHT` sizes when both edges are
 * multiples of 16, the ratio is within 1:3..3:1 and the pixel count is within
 * 655,360..8,294,400. About 1.3 megapixels keeps cost close to the standard
 * 1024x1024 price while giving every ratio enough resolution to be cropped to
 * a platform's exact size. */
const OPENAI_PIXEL_BUDGET = 1_300_000;

export function openAiSizeFor(ratio: ImageAspectRatio): string {
  const r = RATIO_VALUE[ratio];
  const height = Math.round(Math.sqrt(OPENAI_PIXEL_BUDGET / r) / 16) * 16;
  const width = Math.round((height * r) / 16) * 16;
  return `${width}x${height}`;
}

/** The three sizes every gpt-image model is documented to accept - used as a
 * fallback if a custom size is ever rejected. */
export function nearestStandardOpenAiSize(ratio: ImageAspectRatio): string {
  const r = RATIO_VALUE[ratio];
  if (r > 1.2) return '1536x1024';
  if (r < 0.85) return '1024x1536';
  return '1024x1024';
}

/** OpenAI's `quality` parameter for each Image Studio quality tier. */
export const OPENAI_QUALITY: Record<ImageQuality, 'low' | 'medium' | 'high'> = {
  draft: 'low',
  standard: 'medium',
  high: 'high',
};
