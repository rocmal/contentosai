# YouTube integration

Lumora uploads **videos from the Gallery to a YouTube channel**, now or at a time you pick. Uploads, with their
status and any failure reason, are on the **YouTube** page (sidebar, under Creation) and in the Calendar.

Contents:

1. [Set it up (once, by the account owner)](#1-set-it-up-once-by-the-account-owner)
2. [Connect a channel](#2-connect-a-channel)
3. [Upload](#3-upload)
4. [How it works (for developers)](#4-how-it-works-for-developers)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Set it up (once, by the account owner)

YouTube uses the same Google Cloud project and OAuth client as "Sign in with Google" (`GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`), with its own redirect address. Until 1.4 is done, **Connect YouTube** says "YouTube
publishing is not configured".

### 1.1 Turn on the YouTube API

[Google Cloud console](https://console.cloud.google.com/) → pick the project of the Sign in with Google client →
**APIs & Services → Library** → **YouTube Data API v3** → **Enable**.

### 1.2 Add the permissions to the consent screen

**Google Auth Platform → Data access → Add or remove scopes**, add:

| Scope | Why |
| --- | --- |
| `https://www.googleapis.com/auth/youtube.upload` | Upload the videos you choose |
| `https://www.googleapis.com/auth/youtube.readonly` | Read the channel's ID and name, and check the connection still works |

**Audience → Publishing status.** In **Testing**, only the test users listed there can connect, and Google ends the
connection after **7 days**. For real use press **Publish app**. Google then reviews the app because these are
sensitive scopes (until then people see an "unverified app" warning). The review needs the privacy policy
(<https://lumoraos.in/privacy>, which covers YouTube data and Google's Limited Use rule) and usually a short screen
recording of connecting and uploading.

### 1.3 Add the redirect address

**Google Auth Platform → Clients** → the web client used for Sign in with Google → **Authorized redirect URIs** →
add:

```
https://lumoraos.in/api/v1/integrations/youtube/callback
```

For local development also add `http://localhost:3000/api/v1/integrations/youtube/callback`.

### 1.4 Give the address to the server

GitHub → **Settings → Secrets and variables → Actions → Variables** → `YOUTUBE_REDIRECT_URI` =
`https://lumoraos.in/api/v1/integrations/youtube/callback`. The next deploy copies it to the server; its ops-check
lines show:

```
[ops-check] youtube keys set: google client id true, secret true
[ops-check] youtube redirect: https://lumoraos.in/api/v1/integrations/youtube/callback
```

### 1.5 Ask Google for the YouTube audit (for public videos)

YouTube **locks videos uploaded by an app it has not audited to private**, whatever visibility was chosen. To post
public videos, the Google Cloud project has to pass YouTube's API compliance audit: fill in the
[YouTube API Services audit and quota extension form](https://support.google.com/youtube/contact/yt_api_form).
The same form asks for more daily quota: each upload uses a large share of the default allowance (about 1,600 of
10,000 units a day, so roughly six uploads), shown under **APIs & Services → YouTube Data API v3 → Quotas**.

---

## 2. Connect a channel

On the **YouTube** page press **Connect YouTube** (or **Change channel**), sign in with the Google account that owns
the channel and allow the two permissions. Google sends you back to the YouTube page. The page checks with Google
every time it opens that the sign-in still works; if not it says why and offers **Reconnect YouTube**.

One channel per workspace: every upload from the workspace goes to it.

---

## 3. Upload

From the YouTube page (**Upload video**), a Gallery video (the red YouTube button on the card or in its preview),
Video Studio's finished screen (**Upload to YouTube**), the **Create** menus (**YouTube video**) or **Ctrl+K**
("Upload a video to YouTube"):

- **Video:** one from your Gallery. A vertical video of up to 3 minutes appears as a **Short**.
- **Title:** required, up to 100 characters.
- **Description:** up to 5,000 bytes (Hindi and Punjabi letters count as 3). **Speak** types what you say; **Write
  with AI** drafts a title and description (free); check facts and any insurance claims.
- **Who can watch:** Public (default), Unlisted or Private. Until the audit (1.5) YouTube keeps uploads private.
- **When:** **Upload now**, or **Schedule** at least a minute ahead.

Every upload is marked **not made for kids**, and a video made by Lumora's AI (Veo) is marked **altered or synthetic
content**, as YouTube requires for realistic AI video. `<` and `>` are removed (YouTube refuses them).

After uploading: a notification (bell) when it is up or if it failed; the YouTube page lists it under Published
(**Watch on YouTube**) or Failed (with the reason and **Try again**).

---

## 4. How it works (for developers)

| Area | File |
| --- | --- |
| Page | `src/components/views/YouTubePostsView.tsx` (list: `src/components/social/SocialPostList.tsx`, shared with LinkedIn Posts) |
| Upload window | `src/components/YouTubeUploader.tsx`, opened with `openYouTubeUpload()` (`src/lib/socialPosts.ts`) |
| Endpoint | `POST /publishing/posts` with `platforms: ['youtube']`, `title`, `visibility` (`SocialPostsService`) |
| Upload | `apps/api/src/modules/publishing/infrastructure/providers/youtube-publisher.provider.ts` |
| Connect / check | `apps/api/src/modules/integrations/application/services/youtube-connect.service.ts`, `infrastructure/youtube-api.client.ts`; `GET /integrations/youtube/connect?returnTo=youtube-posts`, `GET /integrations/youtube/check` |

The post's title is the video title (so the Calendar's Edit changes it); its text is the description. Content
metadata carries `videoUrl`, `visibility` and `aiGenerated` (the Gallery item has an AI provider). The worker
streams the file from storage into `videos.insert` with `status.privacyStatus`, `selfDeclaredMadeForKids: false`
and `containsSyntheticMedia`. The stored credentials are `{ channelId, channelTitle, refreshToken }`, encrypted.

---

## 5. Troubleshooting

| Message | Cause | What to do |
| --- | --- | --- |
| "YouTube publishing is not configured" | `YOUTUBE_REDIRECT_URI` (or the Google client) is missing on the server | 1.4, then deploy |
| Google says "redirect_uri_mismatch" | The address is not listed on the OAuth client | 1.3 |
| "The YouTube sign-in has expired or was removed" | Revoked in the Google account, or the app is in Testing (7-day limit) | Reconnect; publish the app (1.2) |
| "Google did not return a refresh token" | Google remembered an earlier approval | Remove Lumora at <https://myaccount.google.com/permissions>, connect again |
| "Lumora has used up today's YouTube upload allowance" | The project's daily quota is spent | Try tomorrow; ask for more quota (1.5) |
| "This channel has reached YouTube's upload limit for today" | YouTube's own per-channel limit | Try tomorrow |
| The video is private on YouTube although Public was chosen | The project has not passed the audit | 1.5 |
