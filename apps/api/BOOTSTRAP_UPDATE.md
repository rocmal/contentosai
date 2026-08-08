# Bootstrap Update: Microsoft Edge TTS as the default Voice provider

## Summary

Removed the hard dependency on an Azure Speech account for local development. `VOICE_PROVIDER`
(default `edge`) now selects a new `EdgeTTSProvider` - implementing the existing `IVoiceProvider`
port exactly like Azure/ElevenLabs/Cartesia already do - so Voice Studio and `POST
/api/v1/voice/generate` work with no account, no API key, and no billing. Azure remains fully
supported and optional; switching back (or to ElevenLabs/Cartesia) is a one-line env var change,
not a code change.

No architecture was changed: the port (`IVoiceProvider`) → factory (`VoiceProviderFactory`) →
service (`VoiceService`) → controller (`VoiceController`) chain is exactly what it was before, with
Edge TTS slotted in as one more strategy implementation. `AI_DEFAULT_PROVIDER`/`AIProviderFactory`
already used this same "config picks a default, per-request `provider` can override it" pattern for
text generation - `VOICE_PROVIDER`/`VoiceProviderFactory` now mirrors it exactly for voice.

## Package choice: `msedge-tts`

The ticket asked me to verify the package is actually maintained rather than assume. I checked the
real npm registry metadata (publish dates, license, dependencies) for five candidates before
picking one:

| Package | Latest | Published | License | Verdict |
|---|---|---|---|---|
| **`msedge-tts`** | 2.0.7 | **2026-07-09** | MIT | **Chosen** - most recently published, permissive license, ships TypeScript types, Node ≥16 |
| `node-edge-tts` | 1.2.10 | 2026-02-05 | MIT | CLI-oriented (bundles `yargs`), no `engines` field |
| `edge-tts-node` | 1.5.7 | 2024-11-22 | MIT | Stale - over a year old |
| `@andresaya/edge-tts` | 1.8.0 | 2025-12-13 | **GPL-3.0-only** | Copyleft license risk for a commercial codebase; also targets the Bun runtime, not Node |
| `edge-tts-universal` | 1.4.0 | 2026-02-25 | **AGPL-3.0** | Rejected - AGPL's network-use clause would extend copyleft obligations to the whole SaaS app if bundled as-is |

`msedge-tts` talks to the same free WebSocket service behind Microsoft Edge's "Read Aloud" feature.
It exposes `toStream()` (streams synthesized audio straight into memory - used here, so **no
temporary files are ever written**, satisfying "store temp files only when necessary" by making
them unnecessary), `getVoices()`, and `setMetadata()`/voice selection.

## New files

- **`src/modules/voice/infrastructure/providers/edge-tts.provider.ts`** - `EdgeTTSProvider`,
  implementing `IVoiceProvider.generateSpeech()` / `.listVoices()` / `.healthCheck()`. Streams audio
  via `msedge-tts`'s `toStream()` into a `Buffer`, base64-encodes it into the same
  `VoiceGenerationResult` shape every other provider returns, and always calls `tts.close()` in a
  `finally` block (including on failure) to release the WebSocket connection.
- **`src/modules/voice/infrastructure/providers/edge-tts.provider.spec.ts`** - unit tests with
  `msedge-tts` mocked (`jest.mock('msedge-tts', ...)`): successful synthesis, default-voice
  fallback, connection cleanup on failure, voice listing, and health-check true/false paths.
- **`src/modules/voice/infrastructure/voice-provider.factory.spec.ts`** - provider selection tests:
  explicit provider resolution, `VOICE_PROVIDER` default fallback when the DTO omits `provider`,
  honoring a non-default `VOICE_PROVIDER`, and the `BadRequestException` for an unknown name.
- **`src/modules/voice/application/services/voice.service.spec.ts`** - `VoiceService` tests: DTO →
  factory → provider delegation, the `voice.generated` event still firing, `listVoices()`, and
  `getProviderStatuses()` health-checking every registered provider.
- **`src/common/decorators/raw-response.decorator.ts`** - `@RawResponse()`, a `SetMetadata` marker
  (same pattern as the existing `@Public()`) that tells the global `TransformInterceptor` to leave a
  route's return value untouched instead of wrapping it in the usual `{success, data, timestamp}`
  envelope. Needed because `POST /voice/generate` must return raw audio bytes.

## Modified files

### Voice module (behavior changes)

- **`domain/interfaces/voice-provider.interface.ts`** - added `listVoices(): Promise<VoiceInfo[]>`
  and `healthCheck(): Promise<boolean>` to the `IVoiceProvider` port, plus the new `VoiceInfo` type.
  This is the only "interface change" in the whole update, and it was required by the ticket
  ("Implement generateSpeech(), listVoices(), healthCheck()") - every implementer had to be updated
  to match (see below). `generateSpeech()`'s signature is untouched.
- **`infrastructure/providers/elevenlabs.provider.ts`**, **`cartesia.provider.ts`**,
  **`azure.provider.ts`** - added real `listVoices()` (calling each vendor's actual list-voices
  REST endpoint) and `healthCheck()` (returns whether the provider's API key is configured) so all
  four providers satisfy the extended interface consistently. `generateSpeech()` logic is
  byte-for-byte unchanged; only a small `apiKey`/`region` getter was factored out to avoid repeating
  `this.configService.get(...)` in the new methods.
- **`infrastructure/voice-provider.factory.ts`** - registers `EdgeTTSProvider`; `getProvider(name?)`
  now accepts an **optional** name and falls back to `ai.voice.defaultProvider` (`VOICE_PROVIDER`,
  default `edge`) when omitted, mirroring `AIProviderFactory` exactly.
- **`voice.module.ts`** - registers `EdgeTTSProvider` as a provider.
- **`application/dto/generate-speech.dto.ts`** - `VOICE_PROVIDER_NAMES` now includes `'edge'`;
  `provider` is now `@IsOptional()` so a request can omit it and get the configured default.
- **`application/services/voice.service.ts`** - added `listVoices(providerName?)` and
  `getProviderStatuses()`. `generateSpeech()`'s logic (including the `voice.generated` event
  emission - existing business logic, untouched) is otherwise identical.
- **`presentation/voice.controller.ts`** - `POST /generate` now returns a Nest `StreamableFile`
  wrapping the decoded audio buffer instead of the JSON envelope (see "API contract change" below).
  Added `GET /providers/status` and `GET /voices` to make the new `healthCheck()`/`listVoices()`
  capabilities reachable over HTTP instead of being dead code.

### Common infrastructure (small, additive)

- **`common/decorators/index.ts`** - exports the new `raw-response.decorator.ts`.
- **`common/interceptors/transform.interceptor.ts`** - checks `@RawResponse()` metadata via
  `Reflector` before wrapping a response; passes the value through untouched when present. Every
  other route's behavior (the `{success, data, timestamp}` envelope, paginated-result unwrapping) is
  unchanged.
- **`main.ts`** - `TransformInterceptor` now takes a `Reflector` constructor argument, so its
  instantiation changed from `new TransformInterceptor()` to `new TransformInterceptor(new
  Reflector())`. `Reflector` has no dependencies of its own, so this didn't require moving the
  interceptor into Nest's DI container (`APP_INTERCEPTOR`) - kept the footprint of this change to
  one line.

### Config

- **`config/ai.config.ts`** - added `voice.defaultProvider` (reads `VOICE_PROVIDER`, defaults
  `'edge'`) and an empty `voice.edge` config slot (Edge TTS needs no credentials).
- **`config/env.validation.ts`** - added Joi validation: `VOICE_PROVIDER` must be one of `edge` /
  `azure` / `elevenlabs` / `cartesia`, defaulting to `edge`. Azure's own variables
  (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`) were already optional (`.allow('').default(...)`,
  no `.required()`) - nothing needed to change there.

### Environment files

`VOICE_PROVIDER=edge` added to `.env.example`, `.env.development`, `.env.test`, `.env.staging`,
`.env.production` (all but `.env.example` are gitignored, so they won't show up in `git status`).
No Azure variable was removed or made required anywhere - Azure is simply no longer the *default*.

### Documentation

- **`README.md`** - updated the provider architecture table and added a "Voice providers" section
  documenting how Edge TTS works, how the `VOICE_PROVIDER` default/override mechanism works, and
  how to switch to Azure/ElevenLabs/Cartesia later.

### Frontend (kept in sync so nothing broke)

Changing `/voice/generate`'s response contract required two small frontend updates so the app
still compiles and runs, matching the "everything must compile" bar:

- **`src/lib/api.ts`** - `VOICE_PROVIDERS` now includes `'edge'`; added `rawBlobRequest`/
  `apiRequestBlob` (same bearer-token-and-401-refresh-retry logic as the existing
  `rawRequest`/`apiRequest`, just returning a `Blob` instead of decoding JSON) since the endpoint no
  longer returns the JSON envelope on success. `generateSpeech()` now returns `{ audioUrl,
  mimeType }` where `audioUrl` is a `URL.createObjectURL(blob)` reference instead of a base64 data
  URI.
- **`src/components/views/VoiceStudioView.tsx`** - defaults the provider dropdown to `'edge'`
  (previously `'elevenlabs'`, which has no key configured), adds an "Edge TTS" label, revokes the
  previous object URL before creating a new one on repeat generations (avoids leaking blob URLs),
  and updates the voice-id placeholder to the ticket's example (`en-US-AriaNeural`).

## API contract change: `POST /api/v1/voice/generate`

Per the ticket's explicit spec, this endpoint now returns **raw `audio/mpeg` bytes** on success
(via `StreamableFile`), not the standard `{success, data, timestamp}` JSON envelope every other
endpoint uses. Error responses (e.g. a 503 from a misconfigured provider) are **unaffected** - they
still go through the normal `AllExceptionsFilter` and return the standard JSON error envelope, since
`@RawResponse()` only bypasses the *success*-path wrapping.

```bash
curl -X POST http://localhost:3001/api/v1/voice/generate \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"text":"Hello from Lumora","voiceId":"en-US-AriaNeural"}' \
  -o output.mp3
```

Two new read endpoints were added (not requested verbatim by the ticket, but needed to make
`listVoices()`/`healthCheck()` actually reachable rather than unused interface methods):

- `GET /api/v1/voice/providers/status` → `{ statuses: [{ name, available }, ...] }`
- `GET /api/v1/voice/voices?provider=edge` → `{ voices: [{ id, name, locale, gender }, ...] }`

## Supported default voices (Edge TTS)

Confirmed live against the real Edge TTS service (`GET /voice/voices?provider=edge` returns
hundreds of real voices; these are the ones called out in the ticket):

| Language | Voice |
|---|---|
| English (US) | `en-US-AriaNeural`, `en-US-GuyNeural` |
| English (UK) | `en-GB-SoniaNeural`, `en-GB-RyanNeural` |
| Hindi | `hi-IN-SwaraNeural`, `hi-IN-MadhurNeural` |

Pass any of these as `voiceId` in the request body; omit it to get `en-US-AriaNeural`.

## How to switch providers later

Nothing beyond environment variables:

```bash
# Azure Speech
VOICE_PROVIDER=azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=eastus

# ElevenLabs
VOICE_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...

# Cartesia
VOICE_PROVIDER=cartesia
CARTESIA_API_KEY=...
```

A request can also override the default per-call regardless of `VOICE_PROVIDER`, by sending
`"provider": "azure"` (etc.) in the request body.

## Verification performed

- `npx tsc --noEmit` - clean, both `apps/api` and the frontend.
- `npm run lint` (ESLint) - clean.
- `npm test` - **8 suites / 47 tests passing**, including the 3 new voice spec files.
- `npm run build` - clean, both `apps/api` and the frontend.
- Live end-to-end against the running dev server (not just unit tests):
  - `POST /voice/generate` with no `provider` in the body → defaulted to `edge`, returned a real
    MP3 (`file` confirmed `MPEG ADTS, layer III, v2, 96 kbps, 24 kHz, Monaural`; hex dump showed a
    valid `ff f3` MPEG frame header + LAME encoder tag).
  - `GET /voice/providers/status` → `edge: true`, `elevenlabs`/`cartesia`/`azure: false` (no keys
    configured) - proving `healthCheck()` is wired correctly for every provider.
  - `GET /voice/voices?provider=edge` → hundreds of real voices from the live service.
  - Explicit `"provider": "azure"` still returns its existing `503 Service Unavailable` (Azure not
    configured) - proving the existing provider-selection path is untouched.
- Caught and fixed a real bug during verification: Nest's default response handling treats a raw
  `Buffer` as a plain object and JSON-serializes it (`{"type":"Buffer","data":[...]}`) rather than
  sending it as binary - `curl -o` initially wrote a JSON file with an `audio/mpeg` header attached.
  Switched to `StreamableFile` (Nest's documented mechanism for binary responses), which fixed it;
  re-verified the fix with the same live request.
