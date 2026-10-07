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
- Landing page, pricing plans and footer still advertise Character Studio, Brand Brain and AI Agents. Not yet reworded.

### Dashboard (src/components/views/DashboardView.tsx)

Studio-focused. Top to bottom: greeting + 7/30/90-day switch; three studio cards (Image, Video, Voice) each with a Create
button, saved count and credits used, "Most used" badge; four stat cards (credits remaining, credits used, content created,
published); "Pick up where you left off" (last 8 generated items with Create again) next to "Where your credits went"; a
**Your team** seats card shown only to people with `organizations.manage-members` - Invite a teammate when seats are left
(opens the Team invite form via `src/lib/teamInvite.ts`), Upgrade for more seats when none are.
- Data: `GET /credits/usage?days=` (spend per generation type, net of refunds), `/media/library`, `/media/my` counts,
  publishing jobs (published count only sees the newest 50 jobs).
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

### Studios

- **Image Studio:** OpenAI gpt-image-2 only (picker hidden); platform sizes FB/IG/YouTube/LinkedIn/WhatsApp (X and Pinterest removed);
  Improve with AI; mic dictation; "No text" default with a warning when the prompt asks for text.
- **Video Studio:** Google Veo 3.1 Fast through the Gemini key (VEO_API_KEY optional override); only Veo offered in production;
  17 prompt templates (`src/lib/videoPromptTemplates.ts`); Improve with AI; same prompt+length+format by the same user returns
  the saved clip free (`cacheKey`, `fresh` forces a new one); result and edit previews no longer loop.
- **Voice Studio:** Sarvam for Indian languages; record-your-own-voice (custom voices, ElevenLabs instant clone, needs
  ELEVENLABS_API_KEY); mic dictation on script boxes.
- Credit prices target 50% margin: see `apps/api/src/modules/credits/credits.constants.ts` (image 2/13/50, voice 7 per minute with
  Sarvam, video 180 per 10 s).

### Help (src/components/views/HelpGuideView.tsx, GuidedTourModal.tsx)

Rewritten 2026-10-07 for the current product. The old walkthrough video file (`public/videos/lumora-tutorial.mp4`) is unused.

### Deploy and operations

- Push to `main` runs GitHub Actions "Deploy (Docker)" (tests, build, migrate, seed, recreate, ops-check). "Deploy to cPanel" is
  a legacy workflow that fails on every push; ignore or delete it.
- Vendor keys come from GitHub secrets/variables, applied to the server by `deploy/scripts/apply-managed-env.sh`.
- `deploy/scripts/ops-check.js` prints read-only facts in the deploy log: SMTP, OpenAI and Gemini key status, owner user,
  email queue, avatar image addresses, saved video templates. Never prints secrets.
- Seeders run once per database (sequelize_seeds storage); use a new seeder or migration for data fixes.

## Pending (as of 2026-10-07)

Needs the owner:
- Video Studio "save as template" has never worked on production (`video_templates` is empty). Retry in Scene Builder and read the red
  error on the finished-video screen (the real reason is now shown), then fix the cause.
- Character Studio avatar pictures showed as broken images although the files and database values are correct; hard refresh and
  report. Character Studio is hidden until it is finished.
- Generate one real Veo video (billing must be on the Google project) and check credits taken and the gallery entry.
- Add `ELEVENLABS_API_KEY` (cloning-capable plan) so custom voices work; confirm ElevenLabs/Cartesia/Azure prices (placeholders).
- Confirm the forgot-password email now arrives. Then disable demo accounts `admin@lumora.ai` and `user@lumora.ai`.
- Razorpay live keys and KYC, Google OAuth live redirect URIs, Meta App Review, Sentry DSN, Apache 60 s timeout, GSTIN in Google billing,
  Gemini prepaid auto-reload and budget alert.
- Lawyer review of the landing page "Who owns the content" answer.

Code still to do:
- Reword landing page, pricing plan list and footer that still sell Character Studio, Brand Brain and AI Agents.
- Real invite-by-email (pending invitations). Today the Team page can only add someone who already has an account.
- Show the credit cost before voice, video and avatar generation.
- Count endpoint for published posts (dashboard figure caps at 50).
- Record unsaved Image Studio generations so history is complete.
- About 16 video files and 5 credits/media files in the working copy carry formatting-only changes from a prettier run; they are
  uncommitted noise and can be restored with `git checkout -- <paths>`.
