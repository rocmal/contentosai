# Lumora mobile (iOS + Android)

Expo (React Native, TypeScript, expo-router). Talks to the same NestJS API as the web app (`/api/v1`).

## Scope (v1)

Sign in, then the three creation studios plus Gallery:

- **Image**: prompt, shape, model, quality (credit cost shown), save to photos / share
- **Video**: prompt, 9:16 or 16:9, 5 or 10 sec, model; polls the job, plays inline, save / share
- **Voiceover**: script, voice type, Indian-language picker (Sarvam), voice; plays and shares the MP3
- **Gallery**: your images, videos and voiceovers, filter, open, save, share
- **Profile**: credits balance, sign out

Not in v1: sign-up, Calendar/publishing, Team, Billing (send people to the website), push notifications.

## Run it

```bash
cd apps/mobile
cp .env.example .env     # set EXPO_PUBLIC_API_URL
npm install
npm start                # scan the QR with Expo Go (Android) or the Camera app (iOS)
```

`localhost` is the phone itself on a real device. Point `EXPO_PUBLIC_API_URL` at the production URL, or at your
computer's LAN address (for example `http://192.168.1.20:3000`) when running the API locally. If it is unset in dev,
the app guesses the Expo dev-server host on port 3000.

## Build for the stores

```bash
npm i -g eas-cli && eas login
eas build:configure
eas build --platform android      # .aab for Play Console
eas build --platform ios          # needs an Apple Developer account
```

Bundle id / package: `in.lumoraos.app` (change in `app.json` before the first store build; it cannot change afterwards).

## Layout

- `src/lib/api.ts`: API client (bearer auth, silent refresh, tokens in the OS keychain)
- `src/lib/files.ts`: temp files, save to photos, share
- `src/app/`: screens (`login`, `(tabs)/index|gallery|profile`, `create/image|video|voice`)
- `src/ui/`: shared components and the palette from `design_handoff_mobile_app`
