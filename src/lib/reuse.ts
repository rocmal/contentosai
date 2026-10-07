import type { MediaAssetType } from './api';

/** Which studio a saved item came from, so "Create again" can open the right one. */
export type ReuseStudio = 'image' | 'video' | 'voice';

export interface ReuseRequest {
  studio: ReuseStudio;
  prompt: string;
}

const STORAGE_KEY = 'lumora.reuse';

// Text the studios add to what the person typed. Kept here, in one place, so a
// saved prompt can be turned back into just the person's own words.
export const IMAGE_COMPOSITION_NOTE =
  'Keep the main subject centred with generous empty margin around it, so the picture still works when it is trimmed for different social platforms.';
export const IMAGE_NO_TEXT_NOTE = 'Do not include any text, letters, numbers, logos or watermarks in the image.';

export const VIDEO_STYLE_SUFFIXES = {
  cinematic: 'cinematic style, dramatic lighting, shallow depth of field, film grain',
  socialReel: 'vertical format, fast-paced energetic style, vibrant colors',
  squarePost: 'square format, clean centered composition',
  explainer: 'clean corporate style, bright even lighting, minimal background',
  productAd: 'commercial product advertisement style, studio lighting',
} as const;

export function studioForType(type: MediaAssetType): ReuseStudio | null {
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'voice';
  return null;
}

export const STUDIO_VIEW = { image: 'image-studio', video: 'video-studio', voice: 'voice-studio' } as const;

export const STUDIO_LABEL: Record<ReuseStudio, string> = {
  image: 'Image Studio',
  video: 'Video Studio',
  voice: 'Voice Studio',
};

/** The person's own words, without the hints the studio appended when it saved the prompt. */
export function cleanPrompt(studio: ReuseStudio, saved: string): string {
  let text = saved.trim();
  if (studio === 'image') {
    text = text.replace(IMAGE_COMPOSITION_NOTE, '').replace(IMAGE_NO_TEXT_NOTE, '');
  } else if (studio === 'video') {
    for (const suffix of Object.values(VIDEO_STYLE_SUFFIXES)) {
      if (text.endsWith(`, ${suffix}`)) {
        text = text.slice(0, -(suffix.length + 2));
        break;
      }
    }
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** Leave a note for a studio to pick up when it opens. */
export function requestReuse(request: ReuseRequest): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
  } catch {
    // Storage blocked: the studio just opens empty.
  }
}

/** Read (and soon clear) the note left for this studio, if there is one. */
export function takeReuse(studio: ReuseStudio): ReuseRequest | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReuseRequest;
    if (parsed.studio !== studio || typeof parsed.prompt !== 'string') return null;
    // Cleared a moment later, not at once: React may run a state initializer twice in development.
    window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to clear.
      }
    }, 1500);
    return parsed;
  } catch {
    return null;
  }
}

const GALLERY_SEARCH_KEY = 'lumora.gallerySearch';

/** Ask the Gallery to open with this search already typed in (used by the global search). */
export function requestGallerySearch(query: string): void {
  try {
    window.sessionStorage.setItem(GALLERY_SEARCH_KEY, query);
  } catch {
    // Storage blocked: the Gallery just opens unfiltered.
  }
}

/** The search left for the Gallery, if any. Cleared a moment later because React may run an initializer twice in development. */
export function takeGallerySearch(): string {
  try {
    const query = window.sessionStorage.getItem(GALLERY_SEARCH_KEY) ?? '';
    if (query) {
      window.setTimeout(() => {
        try {
          window.sessionStorage.removeItem(GALLERY_SEARCH_KEY);
        } catch {
          // Nothing to clear.
        }
      }, 1500);
    }
    return query;
  } catch {
    return '';
  }
}