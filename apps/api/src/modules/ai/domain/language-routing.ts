/**
 * Which text-AI engine should write in which language.
 *
 * Indian-language writing (Hindi, Punjabi, Hinglish, ...) goes to Sarvam, which
 * is built for it; everything else goes to the default provider (Gemini). The
 * rule lives here so every studio routes the same way.
 */

const INDIAN_LANGUAGE_NAMES = new Set([
  'hindi',
  'hinglish',
  'punjabi',
  'bengali',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
  'kannada',
  'malayalam',
  'odia',
  'urdu',
  'hi',
  'pa',
  'bn',
  'ta',
  'te',
  'mr',
  'gu',
  'kn',
  'ml',
  'or',
  'ur',
]);

// Unicode blocks for the major Indic scripts (Devanagari, Bengali, Gurmukhi,
// Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam).
const INDIC_SCRIPT = /[ऀ-ൿ]/;

export function isIndianLanguage(language?: string | null): boolean {
  return !!language && INDIAN_LANGUAGE_NAMES.has(language.trim().toLowerCase());
}

/** True when the text itself contains Indic-script letters (Hindi, Punjabi, ...). */
export function containsIndicScript(text?: string | null): boolean {
  return !!text && INDIC_SCRIPT.test(text);
}
