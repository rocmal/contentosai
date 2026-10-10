# Lumora mobile (iOS + Android)

Expo (React Native, TypeScript, expo-router). Talks to the same NestJS API as the web app (`/api/v1`).

## What is in it

- **Sign up / sign in**, forgot password (emails a link that opens the website), **delete account** (Profile; asks for the password; required by both stores)
- **Co-pilot:** text chat (1 credit per reply). "Make a video/voiceover/image" requests open that studio with the prompt filled in
- **Create:** Image, Video and Voiceover studios (credit cost shown before you spend)
- **Calendar:** upcoming, published and failed posts; cancel an upcoming one; open the live post
- **Gallery:** your images, videos and voiceovers; save to photos, share, and schedule a video to a connected social account
- **Team:** list members; add by email and remove (only for people with `organizations.manage-members`)
- **Notifications:** in-app list plus push notifications
- **Plan and credits:** read-only. Buying happens on the website (no purchase buttons in the app, which keeps clear of App Store in-app-purchase rules)

Publishing posts video only, so only videos can be scheduled. Connecting Facebook, Instagram, LinkedIn or YouTube is done on the website (Integrations).

## Push notifications

The phone registers an Expo push token with `POST /notifications/push-tokens`; the API sends through Expo when a notification is created
(`NotificationsService.create`). Needs:

1. Migration `20261008000001-create-push-tokens.js` run on the API database (`npm run db:migrate` from `apps/api`).
2. An EAS project id: run `eas init` once in this folder; it writes `extra.eas.projectId` into `app.json`. Without it the app skips push quietly.
3. A real build or dev build. Push does not work in the iOS simulator, and Expo Go on Android no longer supports it.
4. iOS: an Apple Developer account (EAS sets up the push key). Android: an FCM credential (`eas credentials`).

The API creates notifications when a scheduled post goes live or fails (`SocialPublishProcessor`) and when a video finishes or fails (`VideoProcessor`; reused clips are skipped).
`metadata.link` (`gallery`, `calendar`, `video`, ...) travels in the push data; tapping the push or the in-app row opens that screen (`src/lib/links.ts`).

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
eas init                          # once: creates the EAS project id
eas build --platform android      # .aab for Play Console
eas build --platform ios          # needs an Apple Developer account
```

Bundle id / package: `in.lumoraos.app` (change in `app.json` before the first store build; it cannot change afterwards).

## Layout

- `src/lib/api.ts`: API client (bearer auth, silent refresh, tokens in the OS keychain)
- `src/lib/files.ts`: temp files, save to photos, share
- `src/app/`: screens (`login`, `signup`, `forgot-password`, `(tabs)/index|calendar|gallery|profile`, `create/image|video|voice`, `copilot`,
  `notifications`, `team`, `billing`, `delete-account`). Studios accept a `prompt` route param.
- `src/ui/`: shared components and the palette from `design_handoff_mobile_app`
