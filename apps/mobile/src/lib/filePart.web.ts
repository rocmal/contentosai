/** Browser preview only (Metro picks this over filePart.ts for web): files are Blobs fetched from their URL. */
export async function appendFile(form: FormData, field: string, uri: string, name: string, type: string): Promise<void> {
  const blob = await (await fetch(uri)).blob();
  form.append(field, blob.type ? blob : new Blob([blob], { type }), name);
}

/** The browser picker reports sizes itself. */
export function localFileSize(_uri: string): number | undefined {
  return undefined;
}
