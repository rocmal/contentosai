# Handoff: LumoraOS Mobile App

## Overview
A self-contained, native-app-style mobile experience for LumoraOS — onboarding, sign-in, and a four-tab shell (Home, Calendar, Studio, Profile) built around a central Create flow (AI Wizard, Quick Capture, Voice Note, Upload Media). This is distinct from the existing desktop dashboard's responsive `MobileNav` (a compact bottom bar bolted onto the same 20-view dashboard) — it's a dedicated, purpose-built phone experience with its own onboarding, its own home screen, and its own information architecture.

## About the Design File
`design/LumoraOS Mobile App.dc.html` is a **design reference built in HTML**, not production code to copy verbatim — same convention as `design_handoff_landing_page/`. It renders correctly as a static file but uses a small proprietary templating runtime (`support.js`, not included) to stream-render — do not try to import `support.js` into the app. The reference also links an unrelated "Organic" design-system stylesheet for font loading only; the file's actual colors are hardcoded inline (a blue/slate palette), not that system's tokens — implemented here as real Tailwind utility classes instead.

## Fidelity
**High-fidelity for layout, copy, and interaction flow.** Colors map exactly onto Tailwind's default palette (`#2563eb` → `blue-600`, `#172554` → `blue-950`, `#f1f5f9` → `slate-100`, `#059669` → `emerald-600`, etc.), so implementation reuses Tailwind classes throughout rather than inline styles. The reference's phone-bezel/status-bar/home-indicator chrome is a prototyping device only — not implemented; the real page fills the mobile viewport with `env(safe-area-inset-*)` padding instead.

## Where this plugs into the app
- New route **`/m`** (and `/m/*`), branched in `src/main.tsx` **above** `<App/>` — so the desktop dashboard's own effects (brand profile fetch, settings fetch, hash-based view routing) never mount on this path.
- `src/mobile/MobileApp.tsx` is the root: it reads `useAuth()` and shows the onboarding carousel (once per device, tracked via `localStorage['lumora_mobile_onboarding_seen']`) then the mobile login screen while logged out, or the four-tab app shell once authenticated. Login uses the **real** `AuthContext.login()` — no separate mock auth path.
- Reuses existing infrastructure directly: `AuthContext` for sign-in/session, `api.getMyOrganization()` for the workspace name, `api.getMyCreditWallet()` for the credits card, and `api.listScheduledPosts()` + `api.listContent()` (the same join `ContentCalendarView` performs) for Today's Queue and the Calendar tab.
- The Profile tab's "Studios"/"Workspace"/"Account" menu items link to the existing desktop views by hash (`/#billing`, `/#settings`, etc.) rather than reimplementing 15 sub-screens on mobile.

## Screens / Views
1. **Onboarding** — 3-slide carousel (icon, headline, body), dot indicator, Skip + Next. Shown once per device.
2. **Login** — Lumora mark + wordmark, email/password, real sign-in, link to `/signup` (the existing desktop registration flow — no separate mobile registration form was in scope for this design).
3. **Home** — greeting + workspace name, notification bell (unread dot), AI Wizard hero card, 4 quick-action tiles, 3 stat cards (Generations, Published, Credits — Published and Credits are real; Generations is sample data, see Scope notes), Today's Queue (real, filtered to today), Recent Generations (sample carousel).
4. **Calendar** — 7-day strip for the current week (real dates, not the reference's hardcoded Aug-2026 placeholders), selected day's posts (real).
5. **Studio** — sub-tabs Video/Image/Voice/Character. Video: continue-editing card + step chips + past-projects list (sample). Image/Voice/Character: short summary panels pointing back to desktop for the full editor.
6. **Profile** — avatar/name/workspace, credits card, three link groups to existing desktop views, sign out (real `logout()`).
7. **Create overlay** — full-screen sheet: a 4-option list (AI Wizard, Quick Capture, Voice Note, Upload Media), each with its own sub-screen and back navigation.
8. **Notifications overlay** — Today/Earlier grouped list (sample data, see Scope notes).
9. **Post detail sheet** — bottom sheet for a tapped queue/calendar post, with a live "View live post" link when the platform returned a `permalink`.

## Scope notes — real data vs. sample data
Wired to the real API: authentication, organization/workspace name, credit wallet balance, and all scheduled/published posts (Home queue, Calendar, post detail).

Still sample/local state, because no backing endpoint exists yet:
- **Notifications** — no notifications API in `apps/api` yet.
- **Recent Generations** (Home) — no chronological "generations feed" endpoint (Media Library has assets, not a timeline).
- **Studio's "Continue editing" project, step progress, and past-projects list** — no video-project/timeline API yet.
- **The Create flow's camera capture, voice recording/transcript, and upload grid** — these are UI-only interaction states (matching the design reference's own scope); wiring them to real media capture/upload is a follow-up, not part of this handoff.
- **Mobile registration** — the design only specified a "New to Lumora?" link, not a full second signup form, so it routes to the existing `/signup` page rather than duplicating that flow.

Reconcile these against product priorities before this ships as a primary mobile entry point — in particular, decide whether Notifications and Recent Generations need real endpoints first, or launch as-is with sample content clearly scoped to "coming soon" copy.

## Design Tokens
**Colors** (exact Tailwind equivalents used in implementation):
- Primary blue: `blue-600` (`#2563eb`) / pressed `blue-700` (`#1d4ed8`) / tint `blue-100`/`blue-50`
- Deep navy (hero card, credits card): `blue-950` (`#172554`)
- Emerald accent (published/success): `emerald-600` (`#059669`) / tint `emerald-50`
- Neutrals: `slate-900` text, `slate-600`/`slate-500` secondary text, `slate-100` surface fill, `slate-200` borders

**Typography**: headings, greetings, and stat values use a display face (`Caprasimo`, loaded via Google Fonts, scoped to `.lumora-mobile .font-display` in `src/mobile/mobile.css`) — distinct from the rest of the app's system-sans body text, per the design reference. Body copy stays on the app's default sans stack.

**Radius**: cards 16–24px, pills/buttons 999px (fully rounded) — matches the reference throughout.

## Files
- `design/LumoraOS Mobile App.dc.html` — the full mobile app design reference (open directly in a browser to view/interact).
