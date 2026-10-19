import { MediaAssetType } from './entities/media-asset.entity';
import { repairUploadedName, uploadedFileName } from './upload-name';

// 11:15 in India (UTC+5:30), whatever time zone the tests run in.
const at = new Date(Date.UTC(2026, 9, 16, 5, 45));

describe('repairUploadedName', () => {
  it('turns a Hindi name that arrived as Latin-1 mojibake back into Hindi', () => {
    const mojibake = Buffer.from('बेटी.jpg', 'utf8').toString('latin1');
    expect(repairUploadedName(mojibake)).toBe('बेटी.jpg');
  });

  it('leaves normal names alone', () => {
    expect(repairUploadedName('Policy plan.png')).toBe('Policy plan.png');
    expect(repairUploadedName('café.png')).toBe('café.png');
  });
});

describe('uploadedFileName', () => {
  it('keeps a readable name, including a repaired Hindi one', () => {
    const mojibake = Buffer.from('बेटी का सपना.jpg', 'utf8').toString('latin1');
    expect(uploadedFileName(mojibake, MediaAssetType.IMAGE, at)).toBe('बेटी का सपना.jpg');
    expect(uploadedFileName('LIC plan.png', MediaAssetType.IMAGE, at)).toBe('LIC plan.png');
  });

  it('falls back to a dated name when there is nothing readable', () => {
    expect(uploadedFileName('???.jpg', MediaAssetType.IMAGE, at)).toBe(
      'Image 16 Oct 2026 11.15.jpg',
    );
    expect(uploadedFileName(undefined, MediaAssetType.VIDEO, at)).toBe('Video 16 Oct 2026 11.15');
  });

  it('replaces a machine-made name, from the prompt when the upload has one', () => {
    expect(
      uploadedFileName('817ed7e3-767a-4a23-9149-9935e99c350e.jpg', MediaAssetType.IMAGE, at),
    ).toBe('Image 16 Oct 2026 11.15.jpg');
    expect(
      uploadedFileName(
        'lumora-video-1760882400000.mp4',
        MediaAssetType.VIDEO,
        at,
        'A quiet lake at dawn',
      ),
    ).toBe('A quiet lake at dawn.mp4');
    // A person's own name wins over the prompt.
    expect(
      uploadedFileName('Diwali offer.mp4', MediaAssetType.VIDEO, at, 'A quiet lake at dawn'),
    ).toBe('Diwali offer.mp4');
  });

  it('strips path characters and keeps long names short', () => {
    expect(uploadedFileName('a/b/c.png', MediaAssetType.IMAGE, at)).toBe('a b c.png');
    expect(uploadedFileName('x'.repeat(200) + '.png', MediaAssetType.IMAGE, at).length).toBe(84);
  });
});
