/** AI helpers shared by the studios: Improve with AI, voice typing and saving a preview to the gallery. */
import { Platform } from 'react-native';
import { request, type MediaAsset } from './api';
import { toLocalFile } from './files';

/** Rewrites (or, from an empty box, invents) a prompt or script. Free: no credits are taken. */
export async function improveText(input: {
  prompt: string;
  systemPrompt: string;
  /** 'hindi' | 'punjabi' | 'english' - Indian languages are written by Sarvam on the server. */
  language?: string;
}): Promise<string> {
  const result = await request<{ text: string }>('/ai/generate', { method: 'POST', body: JSON.stringify(input) });
  return result.text.trim();
}

export type DictationLanguage = 'auto' | 'hi-IN' | 'pa-IN' | 'en-IN';

/**
 * A file part for multipart uploads. The phone hands React Native a file path; the browser preview needs a Blob.
 * (React Native's FormData accepts `{ uri, name, type }`, which the DOM typings do not know about.)
 */
async function appendFile(form: FormData, field: string, uri: string, name: string, type: string): Promise<void> {
  if (Platform.OS === 'web') {
    form.append(field, await (await fetch(uri)).blob(), name);
  } else {
    form.append(field, { uri, name, type } as unknown as Blob);
  }
}

/** Voice typing: a short recording (Hindi, Punjabi or English) becomes text. */
export async function transcribe(recordingUri: string, language: DictationLanguage = 'auto'): Promise<string> {
  const form = new FormData();
  // Phones record AAC in an MP4 container (.m4a); the browser preview records WebM.
  const web = Platform.OS === 'web';
  await appendFile(form, 'file', recordingUri, web ? 'speech.webm' : 'speech.m4a', web ? 'audio/webm' : 'audio/mp4');
  form.append('language', language);
  const result = await request<{ text: string }>('/ai/transcribe', { method: 'POST', body: form });
  return result.text.trim();
}

function mimeOf(source: string, fallback: string): string {
  return /^data:([^;]+);/.exec(source)?.[1] ?? fallback;
}

/** Saves a preview (data: URI or URL) to the Gallery, with the prompt so it shows in Creation history. */
export async function uploadToGallery(
  source: string,
  meta: { prompt?: string; provider?: string; model?: string; ext: string; fallbackMime: string },
): Promise<MediaAsset> {
  const file = await toLocalFile(source, meta.ext);
  const type = mimeOf(source, meta.fallbackMime);
  const form = new FormData();
  await appendFile(form, 'file', file.uri, `lumora-${Date.now()}.${meta.ext}`, type);
  if (meta.prompt) form.append('prompt', meta.prompt);
  if (meta.provider) form.append('provider', meta.provider);
  if (meta.model) form.append('model', meta.model);
  return request<MediaAsset>('/media/upload', { method: 'POST', body: form });
}
