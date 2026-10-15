/**
 * Copied from the website (src/lib/sarvamVoices.ts) - keep the two lists in step.
 *
 * Sarvam's voice catalog, shared between Voice Studio and Scene Builder so
 * the 44-entry list isn't duplicated. Mirrors apps/api's SarvamVoiceProvider
 * SARVAM_VOICES - kept in sync manually since this is a display/selection
 * list, not a live API call (Sarvam has no "list voices" endpoint).
 *
 * Every voice was confirmed live on 2026-08-09 (real audio, HTTP 200, both
 * hi-IN and en-IN). Only bulbul:v2's 7 speakers have a Sarvam-documented
 * gender; bulbul:v3's 37 do not - left unset rather than guessed.
 */

export type SarvamVoiceGender = 'female' | 'male';

export interface SarvamVoiceOption {
  id: string;
  name: string;
  gender?: SarvamVoiceGender;
}

export const SARVAM_VOICE_CATALOG: SarvamVoiceOption[] = [
  { id: 'shubh', name: 'Shubh', model: 'bulbul:v3' },
  { id: 'aditya', name: 'Aditya', model: 'bulbul:v3' },
  { id: 'ritu', name: 'Ritu', model: 'bulbul:v3' },
  { id: 'priya', name: 'Priya', model: 'bulbul:v3' },
  { id: 'neha', name: 'Neha', model: 'bulbul:v3' },
  { id: 'rahul', name: 'Rahul', model: 'bulbul:v3' },
  { id: 'pooja', name: 'Pooja', model: 'bulbul:v3' },
  { id: 'rohan', name: 'Rohan', model: 'bulbul:v3' },
  { id: 'simran', name: 'Simran', model: 'bulbul:v3' },
  { id: 'kavya', name: 'Kavya', model: 'bulbul:v3' },
  { id: 'amit', name: 'Amit', model: 'bulbul:v3' },
  { id: 'dev', name: 'Dev', model: 'bulbul:v3' },
  { id: 'ishita', name: 'Ishita', model: 'bulbul:v3' },
  { id: 'shreya', name: 'Shreya', model: 'bulbul:v3' },
  { id: 'ratan', name: 'Ratan', model: 'bulbul:v3' },
  { id: 'varun', name: 'Varun', model: 'bulbul:v3' },
  { id: 'manan', name: 'Manan', model: 'bulbul:v3' },
  { id: 'sumit', name: 'Sumit', model: 'bulbul:v3' },
  { id: 'roopa', name: 'Roopa', model: 'bulbul:v3' },
  { id: 'kabir', name: 'Kabir', model: 'bulbul:v3' },
  { id: 'aayan', name: 'Aayan', model: 'bulbul:v3' },
  { id: 'ashutosh', name: 'Ashutosh', model: 'bulbul:v3' },
  { id: 'advait', name: 'Advait', model: 'bulbul:v3' },
  { id: 'anand', name: 'Anand', model: 'bulbul:v3' },
  { id: 'tanya', name: 'Tanya', model: 'bulbul:v3' },
  { id: 'tarun', name: 'Tarun', model: 'bulbul:v3' },
  { id: 'sunny', name: 'Sunny', model: 'bulbul:v3' },
  { id: 'mani', name: 'Mani', model: 'bulbul:v3' },
  { id: 'gokul', name: 'Gokul', model: 'bulbul:v3' },
  { id: 'vijay', name: 'Vijay', model: 'bulbul:v3' },
  { id: 'shruti', name: 'Shruti', model: 'bulbul:v3' },
  { id: 'suhani', name: 'Suhani', model: 'bulbul:v3' },
  { id: 'mohit', name: 'Mohit', model: 'bulbul:v3' },
  { id: 'kavitha', name: 'Kavitha', model: 'bulbul:v3' },
  { id: 'rehan', name: 'Rehan', model: 'bulbul:v3' },
  { id: 'soham', name: 'Soham', model: 'bulbul:v3' },
  { id: 'rupali', name: 'Rupali', model: 'bulbul:v3' },
];

/** A pre-made sample clip of a voice (English or Hindi), hosted by the website, so listening costs nothing. */
export function voiceSampleUrl(siteUrl: string, voiceId: string, language: 'en' | 'hi'): string {
  return `${siteUrl}/voice-samples/sarvam/${voiceId}-${language}.mp3`;
}
