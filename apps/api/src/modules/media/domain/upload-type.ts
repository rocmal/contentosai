import { MediaAssetType } from './entities/media-asset.entity';

/**
 * What a file uploaded straight into the gallery becomes, decided by its MIME type.
 * Images, videos and audio (for example a voice recording from the phone) are accepted;
 * anything else returns null and is refused.
 */
export function galleryTypeForUpload(mimeType: string | undefined): MediaAssetType | null {
  const type = (mimeType ?? '').toLowerCase();
  if (type.startsWith('image/')) return MediaAssetType.IMAGE;
  if (type.startsWith('video/')) return MediaAssetType.VIDEO;
  if (type.startsWith('audio/')) return MediaAssetType.AUDIO;
  return null;
}
