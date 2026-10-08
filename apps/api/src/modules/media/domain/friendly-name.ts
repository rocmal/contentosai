/**
 * A readable gallery file name from what the user asked for, e.g. "Rows of glowing diyas and marigold.mp4",
 * instead of a provider job id or model path. Falls back to "<Label> <date>" when there is no prompt.
 */
const MAX_WORDS = 6;
const MAX_CHARS = 50;

export function friendlyAssetName(prompt: string | null | undefined, fallbackLabel: string, extension: string): string {
  const cleaned = (prompt ?? '')
    .replace(/[\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s'&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let base = cleaned.split(' ').slice(0, MAX_WORDS).join(' ');
  if (base.length > MAX_CHARS) {
    base = base.slice(0, MAX_CHARS).replace(/\s+\S*$/, '').trim() || base.slice(0, MAX_CHARS).trim();
  }
  if (!base) {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    base = `${fallbackLabel} ${date}`;
  }
  base = base.charAt(0).toUpperCase() + base.slice(1);
  return `${base}.${extension.replace(/^\./, '')}`;
}
