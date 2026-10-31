import { BadRequestException } from '@nestjs/common';
import { GifWriter } from 'omggif';
import * as zlib from 'zlib';
import { preparePicture } from './picture-input';

/** A 3x2 GIF: red, green, blue on the top row; the bottom row is transparent. A second frame turns it all black. */
function animatedGif(): Buffer {
  const out = Buffer.alloc(1024);
  const writer = new GifWriter(out, 3, 2, {
    palette: [0xff0000, 0x00ff00, 0x0000ff, 0x000000],
    loop: 0,
  });
  writer.addFrame(0, 0, 3, 2, [0, 1, 2, 3, 3, 3], { transparent: 3 });
  writer.addFrame(0, 0, 3, 2, [3, 3, 3, 3, 3, 3]);
  return out.subarray(0, writer.end());
}

/** Reads back the RGB rows of an unfiltered 8-bit RGB PNG, checking every chunk's CRC on the way. */
function readPng(png: Buffer): { width: number; height: number; rows: number[][] } {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    expect(png.readUInt32BE(offset + 8 + length)).toBe(
      zlib.crc32(png.subarray(offset + 4, offset + 8 + length)),
    );
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect([data[8], data[9]]).toEqual([8, 2]);
    }
    if (type === 'IDAT') idat.push(data);
    offset += length + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rows: number[][] = [];
  for (let y = 0; y < height; y++) {
    const start = y * (width * 3 + 1);
    expect(raw[start]).toBe(0);
    rows.push([...raw.subarray(start + 1, start + 1 + width * 3)]);
  }
  return { width, height, rows };
}

describe('preparePicture', () => {
  it('turns an animated GIF into a PNG of its first frame, white behind transparency', () => {
    const picture = preparePicture(animatedGif());
    expect(picture.image.mimeType).toBe('image/png');
    expect([picture.width, picture.height]).toEqual([3, 2]);
    const png = readPng(Buffer.from(picture.image.base64, 'base64'));
    expect(png.width).toBe(3);
    expect(png.rows).toEqual([
      [255, 0, 0, 0, 255, 0, 0, 0, 255],
      [255, 255, 255, 255, 255, 255, 255, 255, 255],
    ]);
  });

  it('passes PNG, JPEG and WebP through with their size', () => {
    const png = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.writeUInt32BE(800, 16);
    png.writeUInt32BE(1000, 20);
    expect(preparePicture(png)).toMatchObject({
      image: { mimeType: 'image/png' },
      width: 800,
      height: 1000,
    });

    // SOI, an APP0 segment, then a baseline start-of-frame: 1080 high, 1920 wide.
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38,
      0x07, 0x80, 0x03,
    ]);
    const prepared = preparePicture(jpeg);
    expect(prepared).toMatchObject({
      image: { mimeType: 'image/jpeg' },
      width: 1920,
      height: 1080,
    });
    expect(Buffer.from(prepared.image.base64, 'base64')).toEqual(jpeg);

    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBPVP8X', 8, 'ascii');
    webp.writeUIntLE(1079, 24, 3);
    webp.writeUIntLE(1349, 27, 3);
    expect(preparePicture(webp)).toMatchObject({
      image: { mimeType: 'image/webp' },
      width: 1080,
      height: 1350,
    });
  });

  it('refuses what is not a picture it can send, with a plain reason', () => {
    for (const bytes of [
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      Buffer.from('GIF89a broken'),
    ]) {
      expect(() => preparePicture(bytes)).toThrow(BadRequestException);
    }
    expect(() => preparePicture(Buffer.from('<html>'))).toThrow(/PNG, JPEG, WebP or GIF/);
  });
});
