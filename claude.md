# Lumora

## Project Vision

Enterprise AI Content Operating System

## Architecture

- Clean Architecture
- Hexagonal Architecture
- Repository Pattern
- Modular Monolith

## Backend

NestJS

TypeScript

Sequelize

MySQL

## Future

PostgreSQL

## Frontend

React (Vite)

Tailwind

(The original plan said Next.js + shadcn/ui; the app that ships is a Vite single-page app, view-switched by URL hash.)

## Rules

- Never use sync()
- Always use migrations
- Always use repositories
- Never access Sequelize in controllers
- Business logic must remain database agnostic
- Never use any
- Strict TypeScript
- DTO validation
- Swagger

## Product shape (as of 2026-10-07)

The product is now focused on three creation studios plus a gallery. Real use case: LIC insurance content for an advisor
in Amritsar, so AI output is treated as a draft and compliance wording matters.

### Sidebar (src/components/Sidebar.tsx)

- Main: Dashboard, Calendar
- Creation: Video Studio, Image Studio, Voice Studio, Gallery (view id `media-library`)
- Management: Team, Integrations, Settings, Help & Tutorial
- **Hidden on purpose, code and routes kept** (still reachable by typing the hash, e.g. `#ai-studio`): AI Studio, Brand Brain,
  Projects, Campaigns, Character Studio (also removed from the mobile Studio chip row and Profile menu). To bring one back, add
  its one-line entry to `mainNav` / `creationNav` in Sidebar.tsx.
- Below 1024px the website has a bottom tab bar (`src/components/MobileNav.tsx`): Home, Create (Image/Video/Voice Studio),
  Calendar, Gallery, Menu, like the phone app. Until 2026-10-19 it still linked the hidden AI Studio ("Wizard") and Automation;
  never link a hidden screen from it.
- Landing page, pricing plans, footer and FAQ were reworded to the real product (Image, Video, Voice, Gallery, Team, Calendar,
  Dashboard). Keep them in step with this list when navigation changes.
- The landing hero picture is drawn in code (`src/components/landing/LandingShowcase.tsx`, built from the sign-in page's
  artwork). The old hero and "See LumoraOS in action" videos (`public/videos/`) advertised AI agents, a zero-prompt wizard,
  Brand Brain and Twitter/WordPress posting, and were deleted 2026-10-19. Keep the showcase to features that exist; add a demo
  section back only with a new recording of the current product.

### Header, titles and global search

- Light/dark toggle (header sun/moon, also in Settings): `src/lib/theme.ts` puts the `dark` class on <html>, and index.css makes
  Tailwind's `dark:` follow that class (`@custom-variant dark`). Tailwind v4 otherwise follows the computer's setting, which is why
  the toggle did nothing before 2026-10-19. The choice is per person, kept in the browser (`lumora.theme`); with no choice it follows
  the computer. It is no longer a workspace setting.
- The title area shrinks and truncates; the header controls never shrink (the search box shows just "Search" below 1280px).

- The header (`src/components/Header.tsx`) is the only place a page title and subtitle appear; screens must not repeat them. When you
  add or rename a screen, update `viewTitles` there. The Create button is a menu (Image / Video / Voiceover).
- **Ctrl+K (Cmd+K on a Mac)** toggles the global search from anywhere once signed in (listener in `App.tsx`,
  `src/components/CommandPalette.tsx`). It searches pages, an "Invite a teammate" action (only if allowed), video prompt templates, and
  the whole team's gallery (`/media/library?scope=team&search=`). Choosing a gallery hit opens Gallery with that search
  (`requestGallerySearch` in `src/lib/reuse.ts`); choosing a template opens Video Studio with the prompt. To make a new page findable
  add it to the `pages` list in the palette with a few keywords.

### Dashboard (src/components/views/DashboardView.tsx)

Studio-focused. Top to bottom: greeting + 7/30/90-day switch; three studio cards (Image, Video, Voice) each with a Create
button, saved count and credits used, "Most used" badge; four stat cards (credits remaining, credits used, content created,
published); "Pick up where you left off" (last 8 generated items with Create again) next to "Where your credits went"; a
**Your team** seats card shown only to people with `organizations.manage-members` - Invite a teammate when seats are left
(opens the Team invite form via `src/lib/teamInvite.ts`), Upgrade for more seats when none are.
- Data: `GET /credits/usage?days=` (spend per generation type, net of refunds), `/media/library`, `/media/my` counts,
  `GET /publishing/jobs/summary` (exact scheduled/published/failed counts for the workspace).
- Publishing jobs were not workspace-scoped either (list/get/update/delete) - fixed 2026-10-07 the same way as media; the
  background worker uses `updateAsSystem`.
- `/users/me` now returns `permissions` so the UI can hide actions.

### Gallery (src/components/views/MediaLibraryView.tsx)

Tabs: My gallery, Team gallery (whole workspace, shows creator), Creation history (`generatedOnly`, items with a provider).
Search, type filter, rename (keeps file extension), download, delete, preview, **Create again**.
- Create again hands the prompt to the studio through `src/lib/reuse.ts` (sessionStorage); each studio reads it on open.
  `cleanPrompt` strips the hints studios append (image margin/no-text notes, video style suffix).
- API: `GET /media/library`, `PATCH /media/:id/rename`; `POST /media/upload` accepts prompt/provider/model.
- **Security fix (2026-10-07):** media list/get/update/delete used to ignore workspace and owner. Now workspace-scoped; only the
  creator or an admin/super-admin can change an item; `POST /media` ignores body org/workspace ids; `PATCH` only edits name/prompt.
- History gaps: unsaved images are not recorded (Image Studio keeps an image only on "Save to gallery"); items saved before
  2026-10-07 have no prompt; edited videos exported from the editor are uploads (no prompt).
- Names (`apps/api/src/modules/media/domain/friendly-name.ts`, `upload-name.ts`): generated items are named from the prompt
  (six words). A clip saved before its prompt reached the server ("Video 19 Oct 2026.mp4") is renamed when the prompt arrives
  (`setPromptIfMissing`). Uploads keep the person's own name, but machine names (UUIDs, hex ids, timestamps such as
  "lumora-video-1760882400000") become the prompt-based name or "<Type> <date> <time>". Dates and times are India time
  (`NAME_TIME_ZONE`; the servers run on UTC). Migration 20261019000002 renamed the existing ones; names people typed are never touched.
- Cards: the picture opens the preview, so a card has one row: Create again, Download, and a delete icon that asks first.

### Studios

- **Improve with AI** (Image and Video Studio, website and phone): `src/lib/improvePrompt.ts` and the phone's
  `apps/mobile/src/lib/studioPrompts.ts` (same wording). The prompt is sent marked as the brief to keep - same people,
  action, place, product, names and numbers; add only camera/light/mood/sound (video) or composition/light/colour/style
  (image); a detailed prompt comes back almost unchanged - at temperature 0.3, with an Undo. Until 2026-10-20 it was a plain
  "rewrite the idea" at 0.7, which swapped in generic stock scenes.
- **Vendor errors never reach customers:** text AI (`ai/infrastructure/providers/base-ai-provider.ts`), Veo and Sarvam log
  the vendor's reply and show plain wording ("busy" for 429, "temporarily unavailable on our side" otherwise). Until
  2026-10-20 the text AI showed Google's raw JSON (billing state included) under Improve with AI. Providers not offered in
  production (Stability, Flux, Luma, D-ID, HeyGen, Synthesia) and Razorpay still put vendor text in their messages; fix
  them the same way before offering them.
- **Text boxes** (Image/Video prompt, Voice script, Scene Builder narration, post composer): Ctrl+Z / Ctrl+Y (Cmd+Z /
  Cmd+Shift+Z) through `src/lib/useTextHistory.ts`, which also steps back over templates, Speak and Improve with AI (the
  browser's own undo cannot). Speak into a box that has text asks Add to the end / Replace / Discard (`VoiceInputButton`
  `currentText` + `onReplace`; phone `PromptBox`). Video templates ask before replacing words the person wrote.
- **Video job status uses `GET /video/jobs/status?provider=&jobId=`** (website `getVideoJobStatus`, phone `getVideoJob`).
  Veo job ids contain slashes; in the path they became `%2F`, which the live Apache does not pass to the API - it served the
  website's index.html with 200, the client read that as "no answer" and waited until it timed out, while the server's
  background poller had saved the clip in under a minute. Until 2026-10-20 no prompt video could finish in the browser on the
  live site. Both clients now also throw on an HTML reply instead of returning nothing. `jobs/:jobId` stays for old phone
  builds. VeoProvider only accepts ids shaped like `models/<model>/operations/<id>` (the id goes into a Google URL with our key).
- **Prompt videos take time:** the waiting screen (`videoStudio/GeneratingStatus.tsx`, phone video screen) cycles messages
  every 4 s with a timer and, after 3 minutes, says it is fine to leave. The browser waits 10 minutes, then shows a calm "still
  rendering, it will be in your Gallery" note; the server keeps collecting the clip for 20 minutes
  (`MAX_POLL_ATTEMPTS` in `video.processor.ts`; it was 5 minutes, so slow paid clips were lost). Veo makes 4, 6 or 8 s, so
  the formats use those lengths (5 was rendered as 6 anyway).
- **Image Studio:** OpenAI gpt-image-2 only (picker hidden); platform sizes FB/IG/YouTube/LinkedIn/WhatsApp (X and Pinterest removed);
  Improve with AI; mic dictation; "No text" default with a warning when the prompt asks for text.
- **Video Studio:** Google Veo 3.1 Fast through the Gemini key (VEO_API_KEY optional override); only Veo offered in production;
  17 prompt templates (`src/lib/videoPromptTemplates.ts`); Improve with AI; same prompt+length+format by the same user returns
  the saved clip free (`cacheKey`, `fresh` forces a new one); result and edit previews no longer loop.
  Veo makes only 16:9 or 9:16, so every format is one of those (Feed Post and Product Ad are vertical, like the phone app).
  Previews keep the clip's real shape and are labelled ("Wide 16:9 · fits ..."): website `previewBoxWidth` + `src/lib/videoShape.ts`,
  phone `src/ui/mediaBox.ts` + `src/lib/videoAspect.ts`. Never size a preview with full width + max-height + aspect-ratio (it bends).
  A Scene Builder draft remembers its voice recording (`video_projects.narrationRecordingId`, a custom voice id).
  The server saves every generated clip to the Gallery and says so in the job result (`savedToGallery`); the finished screen
  then shows "Saved to Gallery" instead of uploading a second copy (only text overlays, Scene Builder videos and uploads are
  saved from the browser). Scene Builder's Generate button shows its price: free, or the voice cost when a typed script is voiced.
  Finished screen: Download and "Post or schedule" are the main buttons ("Post or schedule" saves the video to the Gallery
  first if needed, then opens the post composer); Save to Gallery, Share, Facebook, Save as template and Create another sit
  below. A saved text version is named after its text and keeps the prompt, so it can be created again. Video job results
  carry `mediaAssetId` (the clip's Gallery item).
  Code layout (split 2026-10-19): `VideoStudioView.tsx` is a thin shell; `src/components/views/videoStudio/useVideoStudio.ts`
  holds the step flow and combines the area hooks (`useNarration`, `useSceneBuilder`, `useTextOverlay`, `useVideoTemplates`,
  `useShareActions`); each screen part is a component there (CreateStep, PromptPanel, SceneBuilder, SceneList, NarrationPanel,
  EditStep, ResultStep, ...) that reads what it needs from the combined result passed as `studio`.
- **Voice Studio:** Sarvam in Hindi, Punjabi (pa-IN) and English, like the phone app; the script starts empty with an example in
  the chosen language (voice samples exist in Hindi and English; Punjabi plays the Hindi one); record-your-own-voice (custom voices, ElevenLabs instant clone, needs
  ELEVENLABS_API_KEY). Without the key a recording is still saved (voices list as "recording only" + a copy in the Gallery); "Make it speak new scripts" (`POST /custom-voices/:id/activate`) clones it once the key exists. Sarvam bulbul:v2 was retired; v3 only. Mic dictation on script boxes.
- Voice and video buttons show the credit cost before generating (`GET /credits/rates`, `src/lib/creditCost.ts`); the server charges
  from the same tables. Voice is charged per whole minute (150 words each), video per 10 seconds.
- Credit prices target 50% margin: see `apps/api/src/modules/credits/credits.constants.ts` (image 2/13/50, voice 7 per minute with
  Sarvam, video 180 per 10 s).

### Social posting (LinkedIn personal profile first; added 2026-10-19)

Full guide (setup, use, internals, troubleshooting): `docs/LINKEDIN-INTEGRATION.md` - keep it in step with the code.

Posting is not a studio: one **post composer** (`src/components/PostComposer.tsx`, rendered once by App) opens with
`openPostComposer()` (`src/lib/socialPosts.ts`) from the Calendar ("New post"), Gallery cards and preview ("Post"), Image Studio
after saving, Video Studio's finished screen, the header and phone-width Create menus ("Social post") and Ctrl+K. It takes text
(Speak, Write/Improve with AI - free, uses `/ai/generate`), one Gallery image or video, one or more connected accounts, and
Post now or Schedule. The Calendar refreshes itself after a post (`useOnPostCreated`).
- API: `POST /publishing/posts` (`SocialPostsService`) checks every account (media it takes, text length, connected, LinkedIn
  sign-in still valid at the post time), takes media only as a workspace Gallery item id (never a URL), saves one Content and one
  publishing job per account; "Post now" = scheduledAt now. Same queue/worker as before (`SocialPublishProcessor`).
- What each account can post: `PLATFORM_MEDIA_SUPPORT` in `apps/api/src/modules/publishing/domain/post-media.ts`, mirrored in
  `src/lib/socialPosts.ts` and `apps/mobile/src/lib/api-social.ts` - change all three. LinkedIn: text, image or video; Facebook,
  Instagram, YouTube: video only (their image posts are the next step).
- LinkedIn publisher (`linkedin-publisher.provider.ts`): Posts API; images via the Images API; videos via the Videos API (upload
  in parts with ETags, finalize, wait until AVAILABLE - the old code skipped this and could not have worked). Post text is escaped
  for LinkedIn's "little text" format (`linkedin-commentary.ts`; hashtags become hashtag templates, Indian scripts included).
  API version: `LINKEDIN_API_VERSION` (YYYYMM) or, when empty, the month three months back (LinkedIn retires versions after a year).
- LinkedIn sign-ins last 60 days and cannot renew: connection status carries `expiresAt`/`expired`; Integrations shows "Reconnect
  by ..."; the composer warns within 7 days and refuses a time after expiry; a daily job (09:00 India time,
  `ConnectionExpiryReminderService` on the social-publish queue) notifies whoever connected it 7 days before, the day before and on
  the day.
- Phone app: `apps/mobile/src/ui/PostSheet.tsx` (was ScheduleSheet) posts Gallery images and videos through the same endpoint.
- Only personal profiles (`w_member_social`). Company Pages need LinkedIn's Community Management API approval (a separate LinkedIn
  app and review). Deploy keys: secret `LINKEDIN_CLIENT_SECRET`, variables `LINKEDIN_CLIENT_ID`, `LINKEDIN_REDIRECT_URI`
  (`https://lumoraos.in/api/v1/integrations/linkedin/callback`) and optional `LINKEDIN_API_VERSION`; the deploy log's ops-check
  prints whether they are set.
- The Privacy Policy and Terms (`src/components/LegalPage.tsx`, /privacy and /terms) describe the LinkedIn data and the
  one-profile-per-workspace rule; keep them true when posting changes. Disconnect wipes the stored token before the (soft)
  delete, as the policy promises. A square logo for LinkedIn forms is served at /lumora-logo.png (`public/`).
- Local testing without a LinkedIn app: a fake connection in the local database makes the whole flow run; LinkedIn then refuses
  the post with "Invalid access token", which the failed job and its notification show.

### Help (src/components/views/HelpGuideView.tsx, GuidedTourModal.tsx)

Rewritten 2026-10-07 for the current product. There is no walkthrough video (the old one showed the retired product and was
deleted 2026-10-19).

### Deploy and operations

- Push to `main` runs GitHub Actions "Deploy (Docker)" (tests, build, migrate, seed, recreate, ops-check). "Deploy to cPanel" is
  a legacy workflow that fails on every push; ignore or delete it.
- Vendor keys come from GitHub secrets/variables, applied to the server by `deploy/scripts/apply-managed-env.sh`.
- `deploy/scripts/ops-check.js` prints read-only facts in the deploy log: SMTP, OpenAI and Gemini key status, owner user,
  email queue, avatar image addresses, saved video templates. Never prints secrets.
- Seeders run once per database (sequelize_seeds storage); use a new seeder or migration for data fixes.
- **Local copy at https://lumoraos.in** (added 2026-10-10): `deploy/local/` = Docker stack (mysql on 3307, redis, api :3000, web :3100)
  behind XAMPP Apache with a self-signed cert, plus a hosts-file entry. `deploy/local/setup.ps1` sets it all up; `-Hosts off`
  points the domain back at the live server. While the hosts entry is on, this PC cannot reach production by name.
- **Dev mode** (added 2026-10-13): `deploy/local/dev.ps1` stops the api/web containers and runs API (`start:dev`, :3000), web
  (`npm run dev`, http://localhost:3100) and Expo from source against the same Docker MySQL/Redis; `-Stop` switches back.
  API settings: `apps/api/.env.development`. Full change → test → build loop: `deploy/local/README.md`.
- Mobile app icon/splash: the spark mark from `design_handoff_mobile_app` (`apps/mobile/assets/images`, `src/ui/LogoMark.tsx`).
- Mobile studios mirror the website (2026-10-13): Speak + Generate/Improve with AI on every prompt (`apps/mobile/src/ui/PromptBox.tsx`),
  image preview then Save to gallery, Veo-only 8 s video with the 17 templates, Sarvam-only voices with samples. Video templates, Sarvam
  voices and writing instructions are copied from the website (`apps/mobile/src/lib/videoTemplates.ts`, `sarvamVoices.ts`,
  `studioPrompts.ts`) - change both when one changes. Phone recordings are .m4a; the API maps the type for Sarvam (`speechUpload`).
- EAS builds upload only `apps/mobile` because of the root `.easignore` (the whole repo was 331 MB, mostly `ai-services`). EAS reads
  it INSTEAD of `.gitignore`, so it repeats the phone app's ignore rules; check with `npx eas-cli build:inspect --stage archive`.
- Mobile uploads: always add files to FormData with `appendFile` (`apps/mobile/src/lib/filePart.ts`). The app's fetch is Expo's
  (SDK 54+) and refuses React Native's `{ uri, name, type }` parts ("Unsupported FormDataPart implementation"); the browser preview
  hides this, so test uploads on a phone.
- Metro does not type-check: run `npx tsc --noEmit` in `apps/mobile` after every merge. The 2026-10-15 merge dropped the
  `WEBSITE` export (broken Privacy/Terms links) and listed a screen twice in `src/app/_layout.tsx` (the app crashed at launch).
- `npm run lint` in `apps/api` runs ESLint with `--fix`: on Windows it rewrites line endings and formatting in hundreds of files.
  Check with `npx eslint "src/**/*.ts"` (no `--fix`) before committing.

## Pending (as of 2026-10-07)

Needs the owner:
- LinkedIn posting: the LinkedIn side is set up (2026-10-20). Company Page "LumoraOS"
  (https://www.linkedin.com/company/144013705/), developer app "LumoraOS" (https://www.linkedin.com/developers/apps/264160220,
  products Share on LinkedIn + Sign In with LinkedIn using OpenID Connect, redirect URL set), GitHub secret
  `LINKEDIN_CLIENT_SECRET` and variables `LINKEDIN_CLIENT_ID` / `LINKEDIN_REDIRECT_URI` added. Left: connect LinkedIn in
  Integrations on the live site (not from this PC while the hosts entry points lumoraos.in at the local copy) and post once.
- Video Studio "save as template" has never worked on production (`video_templates` is empty). Retry in Scene Builder and read the red
  error on the finished-video screen (the real reason is now shown), then fix the cause.
- Character Studio avatar pictures showed as broken images although the files and database values are correct; hard refresh and
  report. Character Studio is hidden until it is finished.
- Top up the Gemini prepaid credit (Google AI Studio → the project → billing): it ran out on 2026-10-20 (Google answers 402
  "prepayment credits are depleted"), which stops Veo videos AND every Gemini text call (Improve with AI, Write with AI).
  Then re-check that a prompt video finishes in the browser on the live site (the 2026-10-20 status-route fix). Veo itself
  worked on 2026-10-20: a clip was made, saved to the Gallery and charged 180 credits.
- Add `ELEVENLABS_API_KEY` (cloning-capable plan) so custom voices work; confirm ElevenLabs/Cartesia/Azure prices (placeholders).
- Confirm the forgot-password email now arrives. Then disable demo accounts `admin@lumora.ai` and `user@lumora.ai`.
- Razorpay live keys and KYC, Google OAuth live redirect URIs, Meta App Review, Sentry DSN, Apache 60 s timeout, GSTIN in Google billing,
  Gemini prepaid auto-reload and budget alert.
- Lawyer review of the landing page "Who owns the content" answer.

Code still to do:
- Real invite-by-email (pending invitations). Today the Team page can only add someone who already has an account.
- Show the credit cost on avatars when Character Studio returns (the Scene Builder narration price is done).
- Record unsaved Image Studio generations so history is complete.
- Other modules that take ids without checking workspace ownership have not been audited (only media and publishing were fixed).
