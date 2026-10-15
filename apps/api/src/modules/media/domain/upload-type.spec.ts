import { MediaAssetType } from './entities/media-asset.entity';
import { galleryTypeForUpload } from './upload-type';

describe('galleryTypeForUpload', () => {
  it('maps images, videos and audio from their MIME type', () => {
    expect(galleryTypeForUpload('image/jpeg')).toBe(MediaAssetType.IMAGE);
    expect(galleryTypeForUpload('video/quicktime')).toBe(MediaAssetType.VIDEO);
    expect(galleryTypeForUpload('audio/mpeg')).toBe(MediaAssetType.AUDIO);
    // iPhone voice memos and phone recordings
    expect(galleryTypeForUpload('audio/x-m4a')).toBe(MediaAssetType.AUDIO);
    expect(galleryTypeForUpload('AUDIO/MP4')).toBe(MediaAssetType.AUDIO);
  });

  it('refuses everything else', () => {
    expect(galleryTypeForUpload('application/pdf')).toBeNull();
    expect(galleryTypeForUpload('text/html')).toBeNull();
    expect(galleryTypeForUpload('application/octet-stream')).toBeNull();
    expect(galleryTypeForUpload(undefined)).toBeNull();
  });
});
