import { BadRequestException } from '@nestjs/common';
import { GifReader } from 'omggif';
import * as zlib from 'zlib';
import { AIImageInput } from '../domain/interfaces/ai-provider.interface';

export interface PreparedPicture {
  image: AIImageInput;
  /** 0 when the file does not say. */
  width: number;
  height: number;
}

/** A GIF frame is decoded into memory four bytes a pixel; this keeps one still under about 40 MB. */
const MAX_GIF_PIXELS = 10_000_000;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const NO_SIZE = { width: 0, height: 0 };

const unreadable = () =>
  new BadRequestException(
    'That picture is in a format that cannot be read. Use a PNG, JPEG, WebP or GIF.',
  );

/** Turns downloaded bytes into a picture every vision model accepts. The format is read from the bytes themselves
 * (servers often label pictures wrongly). PNG, JPEG and WebP pass through; a GIF - often animated, and refused by
 * Gemini - becomes a PNG of its first frame, which is what a page shows when animation is off. */
export function preparePicture(bytes: Buffer): PreparedPicture {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return {
      image: { mimeType: 'image/png', base64: bytes.toString('base64') },
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return {
      image: { mimeType: 'image/jpeg', base64: bytes.toString('base64') },
      ...jpegSize(bytes),
    };
  }
  if (
    bytes.length >= 16 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return {
      image: { mimeType: 'image/webp', base64: bytes.toString('base64') },
      ...webpSize(bytes),
    };
  }
  if (bytes.length >= 10 && /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))) {
    return gifStill(bytes);
  }
  throw unreadable();
}

function gifStill(bytes: Buffer): PreparedPicture {
  let reader: GifReader;
  try {
    reader = new GifReader(bytes);
  } catch {
    throw unreadable();
  }
  const { width, height } = reader;
  if (width * height > MAX_GIF_PIXELS) {
    throw new BadRequestException('That GIF is too large to read. Try a smaller picture.');
  }
  // White behind transparent pixels, the way the GIF looks on most pages.
  const rgba = new Uint8Array(width * height * 4).fill(255);
  try {
    reader.decodeAndBlitFrameRGBA(0, rgba);
  } catch {
    throw unreadable();
  }
  return {
    image: { mimeType: 'image/png', base64: encodePng(width, height, rgba).toString('base64') },
    width,
    height,
  };
}

/** The smallest valid PNG: 8-bit RGB (the white fill made every pixel opaque), no row filtering. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let i = y * width * 4, end = i + width * 4; i < end; i += 4) {
      raw[o++] = rgba[i];
      raw[o++] = rgba[i + 1];
      raw[o++] = rgba[i + 2];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // RGB; compression, filter and interlace stay 0
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

// zlib.crc32 needs Node 22.2; this keeps the API running on any Node 22.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function jpegSize(bytes: Buffer): { width: number; height: number } {
  let i = 2;
  while (i + 9 <= bytes.length) {
    if (bytes[i] !== 0xff) return NO_SIZE;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    // The start-of-frame markers (C0-CF except C4, C8 and CC) carry the size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  return NO_SIZE;
}

function webpSize(bytes: Buffer): { width: number; height: number } {
  const kind = bytes.toString('ascii', 12, 16);
  if (kind === 'VP8X' && bytes.length >= 30) {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (kind === 'VP8L' && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8 ' && bytes.length >= 30) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  return NO_SIZE;
}
