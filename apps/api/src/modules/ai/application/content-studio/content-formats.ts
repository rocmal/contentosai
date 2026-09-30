export const CONTENT_FORMAT_IDS = [
  'reel',
  'poster',
  'whatsapp',
  'advisor_post',
  'social_post',
  'ad_copy',
  'blog_article',
  'newsletter',
  'custom',
] as const;

export type ContentFormatId = (typeof CONTENT_FORMAT_IDS)[number];

export const CONTENT_LANGUAGES = ['english', 'hindi', 'hinglish', 'punjabi'] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export const LANGUAGE_INSTRUCTIONS: Record<ContentLanguage, string> = {
  english: 'Write in clear, simple English.',
  hindi: 'Write in simple everyday Hindi (Devanagari script). Avoid heavy Sanskritised or technical words.',
  hinglish: 'Write in Hinglish: conversational Hindi written in Roman script, mixing common English words naturally.',
  punjabi: 'Write in simple everyday Punjabi (Gurmukhi script).',
};

interface ContentFormatSpec {
  label: string;
  /** Format-specific instructions for how each JSON field should be written. */
  instructions: string;
}

export const CONTENT_FORMATS: Record<ContentFormatId, ContentFormatSpec> = {
  reel: {
    label: 'Instagram Reel / Short video script',
    instructions: `Create a 20-30 second vertical video script.
- "headline": the on-screen hook for the first 2 seconds (max 10 words).
- "body": the script as numbered scenes. For each scene give: Scene number and duration, On-screen text, Voiceover line, Visual. Keep total voiceover under 75 words. End with a scene carrying the CTA.
- "cta": the closing call-to-action line.
- "visualPrompt": one short paragraph describing the overall look, music mood and the key visual style for the video.`,
  },
  poster: {
    label: 'Social media poster / creative',
    instructions: `Create copy for a single-image poster. Text must be SHORT because it is printed on the image.
- "headline": main poster headline (max 8 words).
- "body": a 1-line sub-headline, then at most 3 short bullet points (max 8 words each).
- "cta": a short call-to-action for the bottom strip (max 10 words).
- "visualPrompt": a detailed image-generation prompt describing the layout, colours, people/scene and mood for the poster. The prompt must say that NO text, numbers or logos should be rendered inside the image (text is added separately).`,
  },
  whatsapp: {
    label: 'WhatsApp message / status creative',
    instructions: `Create a short, personal WhatsApp message a person could forward to family and friends.
- "headline": a short friendly opening line (max 8 words).
- "body": the message, max 70 words, warm and conversational, at most 2 emojis, one idea only.
- "cta": one simple next step (e.g. reply or call to talk).
- "visualPrompt": a short description of a matching WhatsApp status image (no text in the image).`,
  },
  advisor_post: {
    label: 'Advisor trust-building post',
    instructions: `Write an educational post in the first person from the advisor, aimed at building trust rather than selling a specific product.
- "headline": a relatable hook (max 12 words).
- "body": 90-150 words. Explain ONE concept in plain language, using a relatable everyday situation. No product-specific promises.
- "cta": invite the reader to get in touch to understand their own needs.
- "visualPrompt": a short description of a supporting image (no text in the image).`,
  },
  social_post: {
    label: 'Social media post (Facebook / LinkedIn / Instagram)',
    instructions: `Write an engaging social media post.
- "headline": a scroll-stopping first line.
- "body": 80-150 words with short paragraphs.
- "cta": a clear call-to-action.
- "visualPrompt": a short description of a supporting image (no text in the image).`,
  },
  ad_copy: {
    label: 'Ad copy',
    instructions: `Write ad copy with three variations inside "body", labelled Variation 1-3, each with a primary text (max 40 words) and a headline (max 8 words).
- "headline": the strongest of the three headlines.
- "cta": the call-to-action button label plus one supporting line.
- "visualPrompt": a short description of the ad image (no text in the image).`,
  },
  blog_article: {
    label: 'Blog / SEO article',
    instructions: `Write a structured article of 400-600 words.
- "headline": SEO-friendly title.
- "body": article with an intro, 3-4 subheadings and a short conclusion. Use plain text headings.
- "cta": closing call-to-action.
- "visualPrompt": a short description of a header image (no text in the image).`,
  },
  newsletter: {
    label: 'Email newsletter',
    instructions: `Write an email newsletter issue.
- "headline": the subject line (max 9 words).
- "body": a short greeting, one main story or tip (120-180 words), and a sign-off.
- "cta": one clear link/button call-to-action.
- "visualPrompt": a short description of a header image (no text in the image).`,
  },
  custom: {
    label: 'Custom format',
    instructions: `Follow the user's brief exactly for the format.
- "headline": a fitting title or hook.
- "body": the requested content.
- "cta": a call-to-action if one fits, otherwise an empty string.
- "visualPrompt": a short description of a supporting visual (no text in the image).`,
  },
};
