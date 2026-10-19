import { MediaAssetType } from './entities/media-asset.entity';
import { friendlyAssetName, isMachineMadeName, NAME_TIME_ZONE } from './friendly-name';

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
 * The gallery name for an uploaded file: the person's own file name when it is readable; otherwise a name from the
 * prompt it was made from, when the upload says; otherwise "<Type> <date> <time>" (e.g. "Image 16 Oct 2026 11.15.jpg").
 * Never a string of garbled characters or a machine id such as "817ed7e3-767a-...jpg" or "lumora-video-1760882400000.mp4".
 */
export function uploadedFileName(
  originalName: string | undefined,
  type: MediaAssetType,
  now: Date = new Date(),
  prompt?: string | null,
): string {
  const repaired = repairUploadedName((originalName ?? '').normalize('NFC'))
    .replace(/[\/\:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const extension = /\.[a-z0-9]{1,5}$/i.exec(repaired)?.[0] ?? '';
  let base = extension ? repaired.slice(0, -extension.length).trim() : repaired;
  if (base.length > MAX_NAME_CHARS) base = base.slice(0, MAX_NAME_CHARS).trim();

  const readable =
    /[\p{L}\p{N}]/u.test(base) && !/[À-ÿ][\u0080-¿]/.test(base) && !isMachineMadeName(base);
  if (readable) return base + extension;
  if (prompt && /[\p{L}\p{N}]/u.test(prompt)) {
    const named = friendlyAssetName(prompt, '', extension);
    return extension ? named : named.replace(/\.$/, '');
  }

  const date = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: NAME_TIME_ZONE,
  });
  const time = now
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: NAME_TIME_ZONE })
    .replace(':', '.');
  return `${TYPE_LABEL[type] ?? 'File'} ${date} ${time}${extension}`;
}
