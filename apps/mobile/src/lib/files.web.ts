/**
 * Browser preview only (Metro picks this over files.ts for web). There is no photo library or app cache there,
 * so "save" downloads the file and sharing uses the browser's share sheet when it has one.
 */
import type { File } from 'expo-file-system';

function download(href: string, name: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.target = '_blank';
  a.click();
}

/** A unique file name such as voiceover-1760000000000.mp3. */
export function uniqueName(prefix: string, ext: string): string {
  return `${prefix}-${Date.now()}.${ext}`;
}

/** Wraps bytes in a blob URL; callers only read `.uri`. */
export function writeCacheFile(bytes: Uint8Array, name: string): File {
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer]));
  return { uri: url, name } as unknown as File;
}

export async function toLocalFile(source: string, _fallbackExt: string): Promise<File> {
  return { uri: source } as unknown as File;
}

export async function shareMedia(source: string, fallbackExt: string): Promise<void> {
  if (typeof navigator.share === 'function' && /^https?:/.test(source)) {
    await navigator.share({ url: source });
    return;
  }
  download(source, `lumora-${Date.now()}.${fallbackExt}`);
}

export async function saveToPhotos(source: string, fallbackExt: string): Promise<void> {
  download(source, `lumora-${Date.now()}.${fallbackExt}`);
}
