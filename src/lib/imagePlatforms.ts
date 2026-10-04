import type { ImageAspectRatio } from './api';

/** A place an image will be posted, with the exact pixel size that place wants.
 * `generateRatio` is the shape actually generated: a few formats are close
 * enough to share one (a 1.91:1 link post is generated as 16:9 and trimmed a
 * little), so picking several platforms costs one image per distinct ratio,
 * not one per platform. */
export interface ImageTarget {
  id: string;
  platform: string;
  label: string;
  width: number;
  height: number;
  generateRatio: ImageAspectRatio;
}

export const IMAGE_TARGETS: ImageTarget[] = [
  { id: 'fb-post', platform: 'Facebook', label: 'Facebook Post', width: 1200, height: 630, generateRatio: '16:9' },
  { id: 'fb-story', platform: 'Facebook', label: 'Facebook Story', width: 1080, height: 1920, generateRatio: '9:16' },
  { id: 'ig-post', platform: 'Instagram', label: 'Instagram Post', width: 1080, height: 1350, generateRatio: '4:5' },
  { id: 'ig-square', platform: 'Instagram', label: 'Instagram Square', width: 1080, height: 1080, generateRatio: '1:1' },
  { id: 'ig-story', platform: 'Instagram', label: 'Instagram Story / Reel cover', width: 1080, height: 1920, generateRatio: '9:16' },
  { id: 'yt-thumb', platform: 'YouTube', label: 'YouTube Thumbnail', width: 1280, height: 720, generateRatio: '16:9' },
  { id: 'li-post', platform: 'LinkedIn', label: 'LinkedIn Post', width: 1200, height: 627, generateRatio: '16:9' },
  { id: 'x-post', platform: 'X (Twitter)', label: 'X Post', width: 1600, height: 900, generateRatio: '16:9' },
  { id: 'wa-status', platform: 'WhatsApp', label: 'WhatsApp Status', width: 1080, height: 1920, generateRatio: '9:16' },
  { id: 'pin', platform: 'Pinterest', label: 'Pinterest Pin', width: 1000, height: 1500, generateRatio: '2:3' },
];

export const IMAGE_PLATFORM_NAMES: string[] = Array.from(new Set(IMAGE_TARGETS.map((t) => t.platform)));

/** How many images a set of targets needs generated: one per distinct generation ratio. */
export function distinctRatios(targetIds: string[]): ImageAspectRatio[] {
  const ratios = IMAGE_TARGETS.filter((t) => targetIds.includes(t.id)).map((t) => t.generateRatio);
  return Array.from(new Set(ratios));
}

/** Trims a generated image (centre crop, no stretching) to a target's exact
 * pixel size, as a JPEG blob. This is also exactly what the preview shows: a
 * box of the target's shape with the image fitted to cover it. */
export function renderTargetBlob(sourceUrl: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Your browser could not prepare the image.'));
        return;
      }
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image file.'))),
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => reject(new Error('Could not load the generated image.'));
    img.src = sourceUrl;
  });
}
