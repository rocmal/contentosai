/** Multipart uploads that work from the phone and from the browser preview (file parts: filePart.ts / .web.ts). */
import { ApiError, request, type MediaAsset } from './api';
import { appendFile, localFileSize } from './filePart';
import { toLocalFile } from './files';

/** The server's per-file limit for gallery uploads (apps/api media-assets.controller MAX_UPLOAD_BYTES). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function mimeOf(source: string, fallback: string): string {
  return /^data:([^;]+);/.exec(source)?.[1] ?? fallback;
}

/** Saves a preview (data: URI or URL) to the Gallery, with the prompt so it shows in Creation history. */
export async function uploadToGallery(
  source: string,
  meta: { prompt?: string; provider?: string; model?: string; ext: string; fallbackMime: string },
): Promise<MediaAsset> {
  const file = await toLocalFile(source, meta.ext);
  const type = mimeOf(source, meta.fallbackMime);
  const form = new FormData();
  await appendFile(form, 'file', file.uri, `lumora-${Date.now()}.${meta.ext}`, type);
  if (meta.prompt) form.append('prompt', meta.prompt);
  if (meta.provider) form.append('provider', meta.provider);
  if (meta.model) form.append('model', meta.model);
  return request<MediaAsset>('/media/upload', { method: 'POST', body: form });
}

/** A photo, video or audio file picked on the phone (or taken with the camera). */
export interface DeviceFile {
  uri: string;
  kind: 'image' | 'video' | 'audio';
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  flac: 'audio/flac',
  amr: 'audio/amr',
};

const DEFAULTS: Record<DeviceFile['kind'], { ext: string; mime: string; label: string }> = {
  image: { ext: 'jpg', mime: 'image/jpeg', label: 'photo' },
  video: { ext: 'mp4', mime: 'video/mp4', label: 'video' },
  audio: { ext: 'm4a', mime: 'audio/mp4', label: 'audio' },
};

function extensionOf(name: string | null | undefined, uri: string): string | undefined {
  return /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(name ?? uri)?.[1]?.toLowerCase();
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Adds a photo, video or audio file from the phone to the Gallery as-is (no prompt: it was not made with AI). */
export async function uploadDeviceFile(file: DeviceFile): Promise<MediaAsset> {
  // Checked before reading the file, so a huge video is never loaded into memory just to be refused.
  const size = file.fileSize ?? localFileSize(file.uri);
  if (size && size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, `Too big (${formatSize(size)}). Files can be up to 25 MB: trim it or pick a shorter one.`);
  }
  const fallback = DEFAULTS[file.kind];
  const ext = extensionOf(file.fileName, file.uri) ?? fallback.ext;
  const guessed = file.mimeType || EXT_MIME[ext] || fallback.mime;
  // Some phones report .m4a/.mp4 audio as video/mp4; a pick from the audio picker is always stored as audio.
  const type = file.kind === 'audio' && !guessed.startsWith('audio/') ? fallback.mime : guessed;
  const name = file.fileName || `${fallback.label}-${Date.now()}.${ext}`;
  const form = new FormData();
  await appendFile(form, 'file', file.uri, name, type);
  try {
    return await request<MediaAsset>('/media/upload', { method: 'POST', body: form });
  } catch (e) {
    // The server's size check answers "Validation failed (expected size is less than ...)".
    if (e instanceof ApiError && /expected size/i.test(e.message)) {
      throw new ApiError(e.status, 'Too big. Files can be up to 25 MB: trim it or pick a shorter one.');
    }
    throw e;
  }
}

/** How many images and videos this person has in the Gallery, against the shared limit. */
export const getGalleryUsage = () => request<{ count: number; max: number }>('/media/gallery-usage');
