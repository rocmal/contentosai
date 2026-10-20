/**
 * Writing instructions and prompt notes for the studios. Same wording as the website
 * (src/lib/improvePrompt.ts, src/components/views/ImageStudioView.tsx and src/lib/reuse.ts) - keep them in step.
 */
import type { AiWriter } from '@/ui/PromptBox';

export const IMAGE_COMPOSITION_NOTE =
  'Keep the main subject centred with generous empty margin around it, so the picture still works when it is trimmed for different social platforms.';
export const IMAGE_NO_TEXT_NOTE = 'Do not include any text, letters, numbers, logos or watermarks in the image.';

/** Words that mean the picture itself must carry lettering (cards, posters, banners ...). */
export const WANTS_TEXT = /\b(card|poster|banner|flyer|brochure|logo|text|quote|caption|headline|contact|number)\b|\d{6,}/i;

/**
 * "Improve with AI" for image and video prompts keeps the person's prompt as the brief: the same people, action,
 * place, product, names and numbers, adding only what is missing (a plain "rewrite this idea" made the model swap in
 * a stock scene). Same wording as the website's src/lib/improvePrompt.ts.
 */
type PromptKind = 'video' | 'image';

const MAY_ADD: Record<PromptKind, string> = {
  video: 'the camera move (e.g. slow push-in, tracking shot), the lighting, the mood and the natural sounds',
  image: 'the composition, the lighting, the colour palette and the style (e.g. clean professional photo)',
};

function frameImprove(kind: PromptKind, emptyIdea: string) {
  return (idea: string): string =>
    idea
      ? `Improve this ${kind} prompt.\n` +
        'Keep its meaning exactly: the same people, action, place, product, culture and any names, numbers or wording. ' +
        'Do not swap in a different or more generic scene.\n' +
        `Change only what is needed: fix the English (translate it faithfully if it is not in English) and add what it ` +
        `leaves out - ${MAY_ADD[kind]}. If it is already detailed, return it almost unchanged.\n\n` +
        `Prompt to improve:\n"""\n${idea}\n"""`
      : `Write ${kind === 'image' ? 'an image' : 'a video'} prompt for this idea: ${emptyIdea}`;
}

const IMAGE_EMPTY_IDEA = 'A professional, friendly image for a financial advisor to post on social media.';
const VIDEO_EMPTY_IDEA = 'A short, friendly promotional video for a small Indian business.';

export const IMAGE_WRITER: AiWriter = {
  systemPrompt:
    'You improve prompts for an AI image generator used by Indian small businesses and insurance advisors for social ' +
    "media. The user's prompt is their brief: keep everything it says and never replace it with a different or more " +
    'generic scene. Write one detailed English prompt of at most 120 words. Keep every name, phone number and wording ' +
    'the user asked to appear exactly as written, inside double quotes, and say where it should sit. Do not invent ' +
    'claims, rates or guarantees. Reply with only the improved prompt - no preamble, no explanation.',
  emptyIdea: IMAGE_EMPTY_IDEA,
  frame: frameImprove('image', IMAGE_EMPTY_IDEA),
  temperature: 0.3,
};

export const VIDEO_WRITER: AiWriter = {
  systemPrompt:
    'You improve prompts for Google Veo, an AI video generator, for Indian small businesses and insurance advisors. ' +
    "The user's prompt is their brief: keep everything it says and never replace it with a different or more generic " +
    'scene. Describe one continuous shot of 4-8 seconds in one English prompt of at most 90 words (if the prompt is ' +
    'already longer, keep its length). Do not ask for on-screen text, logos or captions. Do not invent claims, rates, ' +
    'returns or guarantees. Reply with only the improved prompt - no preamble, no quotes, no explanation.',
  emptyIdea: VIDEO_EMPTY_IDEA,
  frame: frameImprove('video', VIDEO_EMPTY_IDEA),
  temperature: 0.3,
};

/** Appended to a video prompt; the video model takes one text prompt, so a style is a hint. */
export const VIDEO_STYLES = [
  { id: 'natural', label: 'Natural', suffix: '' },
  { id: 'cinematic', label: 'Cinematic', suffix: 'cinematic style, dramatic lighting, shallow depth of field, film grain' },
  { id: 'energetic', label: 'Energetic reel', suffix: 'fast-paced energetic style, vibrant colors' },
  { id: 'clean', label: 'Clean & bright', suffix: 'clean corporate style, bright even lighting, minimal background' },
  { id: 'product', label: 'Product ad', suffix: 'commercial product advertisement style, studio lighting' },
] as const;
export type VideoStyleId = (typeof VIDEO_STYLES)[number]['id'];

export type ScriptLanguage = 'english' | 'hindi' | 'punjabi';

const LANGUAGE_NAME: Record<ScriptLanguage, string> = { english: 'English', hindi: 'Hindi (Devanagari script)', punjabi: 'Punjabi (Gurmukhi script)' };

/** Voiceover scripts are written in the language that will be spoken (Hindi and Punjabi by Sarvam). */
export function scriptWriter(language: ScriptLanguage): AiWriter {
  return {
    systemPrompt:
      `You write short voiceover scripts in ${LANGUAGE_NAME[language]} for Indian small businesses and insurance advisors ` +
      '(social media reels and ads). If the user gives a script, polish it for speaking aloud without changing its meaning, ' +
      'names or numbers. If the user gives a topic, write a script of 40-80 words. Use short, natural spoken sentences. ' +
      'No emojis, hashtags, headings or stage directions. Do not invent claims, returns, rates or guarantees. ' +
      'Reply with only the script.',
    emptyIdea: 'A warm 20-second message from a local insurance advisor inviting families to plan their protection.',
    language,
  };
}
