import { INDIA_TIME_ZONE } from '@shared/utils/india-time.util';

/** Dates and times in Gallery names are India time: the servers run on UTC, the people using Lumora do not. */
export const NAME_TIME_ZONE = INDIA_TIME_ZONE;

/**
 * A readable gallery file name from what the user asked for, e.g. "Rows of glowing diyas and marigold.mp4",
 * instead of a provider job id or model path. Falls back to "<Label> <date>" when there is no prompt.
 */
const MAX_WORDS = 6;
const MAX_CHARS = 50;

export function friendlyAssetName(
  prompt: string | null | undefined,
  fallbackLabel: string,
  extension: string,
): string {
  const cleaned = (prompt ?? '')
    .replace(/[\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s'&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let base = cleaned.split(' ').slice(0, MAX_WORDS).join(' ');
  if (base.length > MAX_CHARS) {
    base =
      base
        .slice(0, MAX_CHARS)
        .replace(/\s+\S*$/, '')
        .trim() || base.slice(0, MAX_CHARS).trim();
  }
  if (!base) {
    const date = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: NAME_TIME_ZONE,
    });
    base = `${fallbackLabel} ${date}`;
  }
  base = base.charAt(0).toUpperCase() + base.slice(1);
  return `${base}.${extension.replace(/^\./, '')}`;
}

/** "Video 19 Oct 2026.mp4", "Image 19 Oct 2026 (2).png": what friendlyAssetName gives when it had no prompt. */
const PLACEHOLDER_NAME =
  /^(?:Image|Video|Voiceover|Talking avatar) \d{1,2} [A-Za-z]{3,4} \d{4}( \(\d+\))?\.([a-z0-9]{1,5})$/;

/**
 * The prompt-based name for an item that was saved before its prompt was known (the browser's poll can save a
 * finished video before the background worker, which knows the prompt). Null when the name is not such a placeholder
 * - for example the person renamed it - or the prompt has no usable words.
 */
export function nameFromLatePrompt(fileName: string, prompt: string): string | null {
  const match = PLACEHOLDER_NAME.exec(fileName);
  if (!match || !/[\p{L}\p{N}]/u.test(prompt)) return null;
  const [, copyNumber = '', extension] = match;
  return friendlyAssetName(prompt, '', extension).replace(/(\.\w+)$/, `${copyNumber}$1`);
}

/**
 * A file name made by a machine rather than a person: a UUID, a long hex id or a timestamp, optionally after short
 * words such as "video-" or "lumora-video-" (e.g. "817ed7e3-767a-4a23-9149-9935e99c350e", "lumora-video-1760882400000").
 * `base` is the name without its extension.
 */
export function isMachineMadeName(base: string): boolean {
  return /^(?:[a-z]+[-_])*(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,}|\d{10,})$/i.test(
    base,
  );
}
