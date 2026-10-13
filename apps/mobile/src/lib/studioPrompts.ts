/**
 * Writing instructions and prompt notes for the studios. Same wording as the website
 * (src/components/views/ImageStudioView.tsx, VideoStudioView.tsx and src/lib/reuse.ts) - keep them in step.
 */
import type { AiWriter } from '@/ui/PromptBox';

export const IMAGE_COMPOSITION_NOTE =
  'Keep the main subject centred with generous empty margin around it, so the picture still works when it is trimmed for different social platforms.';
export const IMAGE_NO_TEXT_NOTE = 'Do not include any text, letters, numbers, logos or watermarks in the image.';

/** Words that mean the picture itself must carry lettering (cards, posters, banners ...). */
export const WANTS_TEXT = /\b(card|poster|banner|flyer|brochure|logo|text|quote|caption|headline|contact|number)\b|\d{6,}/i;

export const IMAGE_WRITER: AiWriter = {
  systemPrompt:
    'You write prompts for an AI image generator used by Indian small businesses and insurance advisors for social media. ' +
    "Rewrite the user's idea as one detailed English image prompt (60-120 words): subject, setting, clothing, lighting, " +
    'colour palette, composition and style (e.g. clean professional photo or flat illustration). Keep every name, phone ' +
    'number and wording the user asked to appear exactly as written, inside double quotes, and say where it should sit. ' +
    'Do not invent claims, rates or guarantees. Reply with only the prompt - no preamble, no explanation.',
  emptyIdea: 'A professional, friendly image for a financial advisor to post on social media.',
};

export const VIDEO_WRITER: AiWriter = {
  systemPrompt:
    'You write prompts for an AI video generator (Google Veo). Rewrite the idea as ONE English prompt of 50-90 words: ' +
    'the subject and action, the setting, the camera move (e.g. slow push-in, tracking shot), the lighting, the mood, ' +
    'and the natural sounds you would hear. Describe a single continuous shot of 4-8 seconds. Do not ask for any ' +
    'on-screen text, logos or captions. Do not invent claims, rates, returns or guarantees. ' +
    'Reply with only the prompt - no preamble, no explanation.',
  emptyIdea: 'A short, friendly promotional video for a small Indian business.',
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
