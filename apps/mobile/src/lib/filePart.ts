import { File } from 'expo-file-system';

/**
 * Adds a local file to a multipart form on the phone.
 *
 * Since SDK 54 the app's fetch is Expo's own (expo/fetch). It only sends file parts that can hand over their bytes;
 * React Native's classic `{ uri, name, type }` object fails with "Unsupported FormDataPart implementation".
 * `name` and `type` become the part's filename and Content-Type, which the server relies on.
 * The browser preview uses filePart.web.ts.
 */
export async function appendFile(form: FormData, field: string, uri: string, name: string, type: string): Promise<void> {
  const file = new File(uri);
  form.append(field, { name, type, bytes: () => file.bytes() } as unknown as Blob);
}

/** Size in bytes of a local file, when the picker did not report it. */
export function localFileSize(uri: string): number | undefined {
  try {
    return new File(uri).size;
  } catch {
    return undefined;
  }
}
