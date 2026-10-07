import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

function extensionFor(source: string, fallback: string): string {
  const dataMime = /^data:([^;]+);/.exec(source)?.[1];
  if (dataMime) return dataMime.split('/')[1]?.replace('jpeg', 'jpg') || fallback;
  const fromUrl = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(source)?.[1];
  return fromUrl?.toLowerCase() || fallback;
}

/** Writes raw bytes (e.g. generated speech) to the cache directory and returns the file. */
export function writeCacheFile(bytes: Uint8Array, name: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file;
}

/** Brings a remote URL or data: URI down to a local file so it can be shared or saved. */
export async function toLocalFile(source: string, fallbackExt: string): Promise<File> {
  const name = `lumora-${Date.now()}.${extensionFor(source, fallbackExt)}`;
  if (source.startsWith('data:')) {
    const base64 = source.slice(source.indexOf(',') + 1);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return writeCacheFile(bytes, name);
  }
  return File.downloadFileAsync(source, new File(Paths.cache, name));
}

export async function shareMedia(source: string, fallbackExt: string): Promise<void> {
  const file = await toLocalFile(source, fallbackExt);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri);
}

/** Saves an image or video to the phone's photo library (asks for permission the first time). */
export async function saveToPhotos(source: string, fallbackExt: string): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('Allow photo access in Settings to save to your phone.');
  const file = await toLocalFile(source, fallbackExt);
  await MediaLibrary.saveToLibraryAsync(file.uri);
}
