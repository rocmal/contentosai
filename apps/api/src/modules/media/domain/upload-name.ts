import { MediaAssetType } from './entities/media-asset.entity';

const MAX_NAME_CHARS = 80;

/**
 * Browsers send file names as UTF-8 but the upload parser reads them as Latin-1, so a Hindi name such as
 * "बेटी.jpg" arrives as "à¤¬à¥‡..." mojibake. Turns it back; anything that is not mojibake is returned as is.
 */
export function repairUploadedName(name: string): string {
  if (![...name].every((char) => char.charCodeAt(0) <= 0xff) || !/[\u0080-ÿ]/.test(name)) {
    return name;
  }
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

const TYPE_LABEL: Partial<Record<MediaAssetType, string>> = {
  [MediaAssetType.IMAGE]: 'Image',
  [MediaAssetType.VIDEO]: 'Video',
  [MediaAssetType.AUDIO]: 'Audio',
};

/**
 * The gallery name for an uploaded file: the person's own file name when it is readable, otherwise
 * "<Type> <date> <time>" (e.g. "Image 16 Oct 2026 11.15.jpg"), never a string of garbled characters.
 */
export function uploadedFileName(
  originalName: string | undefined,
  type: MediaAssetType,
  now: Date = new Date(),
): string {
  const repaired = repairUploadedName((originalName ?? '').normalize('NFC'))
    .replace(/[\/\:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const extension = /\.[a-z0-9]{1,5}$/i.exec(repaired)?.[0] ?? '';
  let base = extension ? repaired.slice(0, -extension.length).trim() : repaired;
  if (base.length > MAX_NAME_CHARS) base = base.slice(0, MAX_NAME_CHARS).trim();

  const readable = /[\p{L}\p{N}]/u.test(base) && !/[À-ÿ][\u0080-¿]/.test(base);
  if (readable) return base + extension;

  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  return `${TYPE_LABEL[type] ?? 'File'} ${date} ${time}${extension}`;
}
