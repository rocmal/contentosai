/**
 * A plain name for a video's shape (width / height) and where it fits, for labels under previews.
 * The phone app has a copy (apps/mobile/src/lib/videoShape.ts) - keep the two in step.
 */
export interface VideoShape {
  /** e.g. "Wide 16:9" */
  name: string;
  /** e.g. "YouTube, Facebook and LinkedIn" */
  fitsOn: string;
}

const KNOWN: { ratio: number; name: string; fitsOn: string }[] = [
  { ratio: 16 / 9, name: 'Wide 16:9', fitsOn: 'YouTube, Facebook and LinkedIn' },
  { ratio: 9 / 16, name: 'Vertical 9:16', fitsOn: 'Reels, Shorts, Stories and WhatsApp Status' },
  { ratio: 1, name: 'Square 1:1', fitsOn: 'Instagram and Facebook feeds' },
  { ratio: 4 / 5, name: 'Portrait 4:5', fitsOn: 'the Instagram feed' },
];

export function describeVideoShape(ratio: number): VideoShape {
  const match = KNOWN.find((k) => Math.abs(k.ratio - ratio) / k.ratio < 0.03);
  if (match) return { name: match.name, fitsOn: match.fitsOn };
  return ratio > 1
    ? { name: 'Wide', fitsOn: 'YouTube and Facebook' }
    : { name: 'Tall', fitsOn: 'Reels, Shorts and Stories' };
}
