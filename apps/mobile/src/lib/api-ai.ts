/** AI helpers shared by the studios: Improve with AI and voice typing. */
import { Platform } from 'react-native';
import { request } from './api';
import { appendFile } from './filePart';

/** Rewrites (or, from an empty box, invents) a prompt or script. Free: no credits are taken. */
export async function improveText(input: {
  prompt: string;
  systemPrompt: string;
  /** 'hindi' | 'punjabi' | 'english' - Indian languages are written by Sarvam on the server. */
  language?: string;
  /** 0-2; lower keeps a rewrite closer to the original (the server default is 0.7). */
  temperature?: number;
}): Promise<string> {
  const result = await request<{ text: string }>('/ai/generate', { method: 'POST', body: JSON.stringify(input) });
  return cleanAiText(result.text);
}

/** Strips what models sometimes wrap their answer in: quotes, triple quotes or an "Improved prompt:" label. */
export function cleanAiText(text: string): string {
  return text
    .trim()
    .replace(/^(improved|revised|final)?\s*prompt\s*:\s*/i, '')
    .replace(/^"""\s*|\s*"""$/g, '')
    .replace(/^"([^"]*)"$/s, '$1')
    .trim();
}

export type DictationLanguage = 'auto' | 'hi-IN' | 'pa-IN' | 'en-IN';

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
