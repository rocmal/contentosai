/**
 * "Improve with AI" / "Generate with AI" for the Image and Video Studio prompt boxes. The model gets the person's prompt
 * clearly marked as the brief to keep, with strict rules: same people, action, place, product, names and numbers; add
 * only what is missing; return a detailed prompt almost unchanged. A plain "rewrite this idea" made the model swap in a
 * stock scene. The phone app's apps/mobile/src/lib/studioPrompts.ts uses the same wording - change both together.
 */

export type PromptKind = 'video' | 'image';

/** Low, so a rewrite stays close to what was written. */
const TEMPERATURE = 0.3;

const SYSTEM_PROMPT: Record<PromptKind, string> = {
  video:
    'You improve prompts for Google Veo, an AI video generator, for Indian small businesses and insurance advisors. ' +
    "The user's prompt is their brief: keep everything it says and never replace it with a different or more generic " +
    'scene. Describe one continuous shot of 4-8 seconds in one English prompt of at most 90 words (if the prompt is ' +
    'already longer, keep its length). Do not ask for on-screen text, logos or captions. Do not invent claims, rates, ' +
    'returns or guarantees. Reply with only the improved prompt - no preamble, no quotes, no explanation.',
  image:
    'You improve prompts for an AI image generator used by Indian small businesses and insurance advisors for social ' +
    "media. The user's prompt is their brief: keep everything it says and never replace it with a different or more " +
    'generic scene. Write one detailed English prompt of at most 120 words. Keep every name, phone number and wording ' +
    'the user asked to appear exactly as written, inside double quotes, and say where it should sit. Do not invent ' +
    'claims, rates or guarantees. Reply with only the improved prompt - no preamble, no explanation.',
};

/** What a prompt may gain; everything else stays as written. */
const MAY_ADD: Record<PromptKind, string> = {
  video: 'the camera move (e.g. slow push-in, tracking shot), the lighting, the mood and the natural sounds',
  image: 'the composition, the lighting, the colour palette and the style (e.g. clean professional photo)',
};

/** Used when the box is empty ("Generate with AI"). */
const EMPTY_IDEA: Record<PromptKind, string> = {
  video: 'A short, friendly promotional video for a small Indian business.',
  image: 'A professional, friendly image for a financial advisor to post on social media.',
};

/** The /ai/generate request for the prompt box's AI button. */
export function improvePromptRequest(
  kind: PromptKind,
  idea: string,
): { prompt: string; systemPrompt: string; temperature: number } {
  const brief = idea.trim();
  const prompt = brief
    ? `Improve this ${kind} prompt.\n` +
      'Keep its meaning exactly: the same people, action, place, product, culture and any names, numbers or wording. ' +
      'Do not swap in a different or more generic scene.\n' +
      `Change only what is needed: fix the English (translate it faithfully if it is not in English) and add what it ` +
      `leaves out - ${MAY_ADD[kind]}. If it is already detailed, return it almost unchanged.\n\n` +
      `Prompt to improve:\n"""\n${brief}\n"""`
    : `Write ${kind === 'image' ? 'an image' : 'a video'} prompt for this idea: ${EMPTY_IDEA[kind]}`;
  return { prompt, systemPrompt: SYSTEM_PROMPT[kind], temperature: TEMPERATURE };
}

/** Strips what models sometimes wrap a prompt in: quotes, triple quotes or an "Improved prompt:" label. */
export function cleanImprovedPrompt(text: string): string {
  return text
    .trim()
    .replace(/^(improved|revised|final)?\s*prompt\s*:\s*/i, '')
    .replace(/^"""\s*|\s*"""$/g, '')
    .replace(/^"([^"]*)"$/s, '$1')
    .trim();
}
