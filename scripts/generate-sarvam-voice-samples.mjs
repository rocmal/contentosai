#!/usr/bin/env node
/**
 * One-off/maintenance script: generates a short local preview clip - in
 * BOTH Hindi and English - for every Sarvam voice in src/lib/sarvamVoices.ts,
 * so the voice picker's "Preview" button never has to hit the live API and
 * always plays back in whatever language is currently selected (rather than
 * always Hindi regardless of the Language toggle).
 *
 * Run manually whenever the voice catalog changes:
 *   node scripts/generate-sarvam-voice-samples.mjs
 *
 * Reads SARVAM_API_KEY from apps/api/.env.development. Writes two files per
 * voice - {id}-hi.mp3 and {id}-en.mp3 - into public/voice-samples/sarvam/
 * (Vite serves public/ verbatim, and `vite build` copies it into dist/, so
 * no separate deploy step needed for these files).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(REPO_ROOT, 'apps/api/.env.development');
const OUT_DIR = path.join(REPO_ROOT, 'public/voice-samples/sarvam');

// Same fixed phrase (translated) for every voice in a given language - lets
// someone compare voices apples-to-apples rather than judging different
// sentences.
const SAMPLE_TEXT_BY_LANGUAGE = {
  hi: { text: 'नमस्ते, मैं Lumora AI की आवाज़ हूँ।', languageCode: 'hi-IN' },
  en: { text: 'Hello, I am the voice of Lumora AI.', languageCode: 'en-IN' },
};
const REQUEST_DELAY_MS = 400; // be polite to the API across ~88 calls

function readApiKey() {
  const content = readFileSync(ENV_FILE, 'utf8');
  const match = content.match(/^SARVAM_API_KEY=(.*)$/m);
  const key = match?.[1]?.trim();
  if (!key) {
    throw new Error(`SARVAM_API_KEY not found/empty in ${ENV_FILE}`);
  }
  return key;
}

// Mirrors src/lib/sarvamVoices.ts's SARVAM_VOICE_CATALOG - duplicated here
// rather than imported since this plain Node script doesn't run through
// Vite/ts-node. Keep the two lists in sync if the catalog changes.
const VOICES = [
  { id: 'anushka', model: 'bulbul:v2' },
  { id: 'manisha', model: 'bulbul:v2' },
  { id: 'vidya', model: 'bulbul:v2' },
  { id: 'arya', model: 'bulbul:v2' },
  { id: 'abhilash', model: 'bulbul:v2' },
  { id: 'karun', model: 'bulbul:v2' },
  { id: 'hitesh', model: 'bulbul:v2' },
  { id: 'shubh', model: 'bulbul:v3' },
  { id: 'aditya', model: 'bulbul:v3' },
  { id: 'ritu', model: 'bulbul:v3' },
  { id: 'priya', model: 'bulbul:v3' },
  { id: 'neha', model: 'bulbul:v3' },
  { id: 'rahul', model: 'bulbul:v3' },
  { id: 'pooja', model: 'bulbul:v3' },
  { id: 'rohan', model: 'bulbul:v3' },
  { id: 'simran', model: 'bulbul:v3' },
  { id: 'kavya', model: 'bulbul:v3' },
  { id: 'amit', model: 'bulbul:v3' },
  { id: 'dev', model: 'bulbul:v3' },
  { id: 'ishita', model: 'bulbul:v3' },
  { id: 'shreya', model: 'bulbul:v3' },
  { id: 'ratan', model: 'bulbul:v3' },
  { id: 'varun', model: 'bulbul:v3' },
  { id: 'manan', model: 'bulbul:v3' },
  { id: 'sumit', model: 'bulbul:v3' },
  { id: 'roopa', model: 'bulbul:v3' },
  { id: 'kabir', model: 'bulbul:v3' },
  { id: 'aayan', model: 'bulbul:v3' },
  { id: 'ashutosh', model: 'bulbul:v3' },
  { id: 'advait', model: 'bulbul:v3' },
  { id: 'anand', model: 'bulbul:v3' },
  { id: 'tanya', model: 'bulbul:v3' },
  { id: 'tarun', model: 'bulbul:v3' },
  { id: 'sunny', model: 'bulbul:v3' },
  { id: 'mani', model: 'bulbul:v3' },
  { id: 'gokul', model: 'bulbul:v3' },
  { id: 'vijay', model: 'bulbul:v3' },
  { id: 'shruti', model: 'bulbul:v3' },
  { id: 'suhani', model: 'bulbul:v3' },
  { id: 'mohit', model: 'bulbul:v3' },
  { id: 'kavitha', model: 'bulbul:v3' },
  { id: 'rehan', model: 'bulbul:v3' },
  { id: 'soham', model: 'bulbul:v3' },
  { id: 'rupali', model: 'bulbul:v3' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateSample(apiKey, voice, language, attempt = 1) {
  const { text, languageCode } = SAMPLE_TEXT_BY_LANGUAGE[language];
  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      text,
      language_code: languageCode,
      speaker: voice.id,
      model: voice.model,
      output_audio_codec: 'mp3',
    }),
  });

  if (!response.ok) {
    if (attempt < 2) {
      await sleep(1000);
      return generateSample(apiKey, voice, language, attempt + 1);
    }
    const body = await response.text();
    throw new Error(`${voice.id}/${language} (${voice.model}): HTTP ${response.status} - ${body}`);
  }

  const body = await response.json();
  const audioBase64 = body.audios?.[0];
  if (!audioBase64) {
    throw new Error(`${voice.id}/${language} (${voice.model}): no audio in response`);
  }
  return Buffer.from(audioBase64, 'base64');
}

async function main() {
  const apiKey = readApiKey();
  mkdirSync(OUT_DIR, { recursive: true });

  const languages = Object.keys(SAMPLE_TEXT_BY_LANGUAGE);
  const total = VOICES.length * languages.length;
  console.log(`Generating ${total} voice samples (${languages.join('+')}) into ${path.relative(REPO_ROOT, OUT_DIR)}...`);
  const failures = [];
  let done = 0;

  for (const voice of VOICES) {
    for (const language of languages) {
      done += 1;
      process.stdout.write(`[${done}/${total}] ${voice.id}-${language} (${voice.model})... `);
      try {
        const audioBuffer = await generateSample(apiKey, voice, language);
        writeFileSync(path.join(OUT_DIR, `${voice.id}-${language}.mp3`), audioBuffer);
        console.log(`ok (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.log(`FAILED - ${err.message}`);
        failures.push(`${voice.id}-${language}`);
      }
      if (done < total) await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log('');
  if (failures.length > 0) {
    console.log(`Done with ${failures.length} failure(s): ${failures.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Done - all ${total} samples generated successfully.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
