# Handoff: LumoraOS Public Marketing Landing Page

## Overview
A single-page, customer-facing marketing site for **LumoraOS** (lumoraos.in), an AI content operating system (image generation, voice cloning, lip-sync talking avatars, video, brand memory, automation/agents, analytics, calendar & publishing). This is the **public front door** for the product — today the `contentosai` app has no public marketing site, only `LoginView` (unauthenticated) and the internal dashboard app (authenticated). This page should become the new logged-out "/" experience.

## About the Design Files
The file in `design/LumoraOS Landing.dc.html` (and `design/LumoraOS Logo Options.dc.html`) is a **design reference built in HTML**, not production code to copy verbatim. It renders correctly as a static HTML file but uses a small proprietary templating runtime (`support.js`, not included) to stream-render — do not try to import `support.js` into the app. Recreate the visual design and behavior described below as real React components inside the existing `contentosai` Vite + React + Tailwind app, using its existing patterns (see `src/components/`, `src/contexts/AuthContext.tsx`, `src/lib/api.ts`).

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and interactions below are final — implement pixel-close, adapting only to fit Tailwind's utility classes instead of inline styles.

## Where this plugs into the app
- `contentosai/src/App.tsx` currently does: `if (!isAuthenticated) return <LoginView />` else render the full dashboard shell.
- Add a new **public landing route** shown at `/` for logged-out visitors, with `LoginView` moving to `/login` (or a modal/step reached via the landing page's "Log in" / "Start free trial" buttons). The app has no router today — introduce `react-router-dom` (or similar) with at least: `/` (new `LandingPage`), `/login` (existing `LoginView`), and the authenticated app mounted at `/app` (or root once authenticated, matching current behavior).
- Reuse `AuthContext` for auth state; landing page itself needs no auth.
- **Pricing reconciliation needed**: `src/components/views/BillingView.tsx` already has an in-app plan model (Starter $49/2,500 credits, Pro OS $149/10,000 credits, Enterprise $499/unlimited) in USD. The marketing page below uses newly-designed placeholder INR/USD pricing (Starter/Pro/Enterprise at different numbers) since real pricing wasn't finalized when this was designed. **Reconcile these into one source of truth** (ideally plan data served from `apps/api`) before shipping — do not ship two different prices for the same plan names.

## Screens / Views

### Landing Page (single page, anchor-navigated sections)
Dark theme throughout, `#0B1120` page background, `#0F172A` for alternating section bands, Inter font.

1. **Nav** — sticky, blurred dark bg. Logo (see Assets/Logo) + "LumoraOS" wordmark, left. Center/right: anchor links `#features` `#how-it-works` `#pricing` `#faq`. Right: "Log in" (ghost text button, → `/login`) and "Start free trial" (gradient pill button, → `#pricing` or signup flow).
2. **Hero** — centered, max-width 900px. Eyebrow pill "AI CONTENT OPERATING SYSTEM". H1 "One platform for every piece of content your brand needs." Subhead about image/voice/lip-sync/video. Two CTAs (Start free trial / See pricing) + "Cancel anytime. No setup fees." caption. Below: full-width autoplaying muted looped video (`lumora-brand-ad.mp4`) in a rounded, bordered frame, replacing what was originally a screenshot placeholder.
3. **The Name** — short callout: "Lumora blends *lumen* … *aura* …" (one paragraph, centered, max-width 720px).
4. **Trust strip** — labeled "customer logos — replace with your own", 5 dashed placeholder boxes. **Real customer logos still needed from the user before this ships.**
5. **Features grid** — 8 cards, `auto-fit minmax(260px,1fr)` grid: Image Studio, Voice Studio, Character Studio (lip-sync), Video Studio, Brand Brain, AI Agents & Automation, Calendar & Publishing, Analytics. Each: 44px icon badge (tinted rounded square, simple line icon), title, 2-line description (see design file for exact copy).
6. **How it works** — 4 numbered steps (01–04): Set up Brand Brain → Generate → Review & approve → Publish everywhere.
7. **Demo** — "See LumoraOS in action" + embedded `lumora-tutorial.mp4` with native controls.
8. **Integrations** — two rows of pill badges: AI models (Gemini, GPT-4o, Claude, Flux/Stable Diffusion, ElevenLabs) and Publish-to channels (LinkedIn, YouTube, Twitter/X, Instagram, Slack, WordPress). Plain text pills, not logos (avoids trademark logo reproduction).
9. **Comparison** — "Replace five tools with one" — 2-column table, 5 rows, left = "Fragmented tools" (muted, X icon), right = "LumoraOS" (highlighted, check icon).
10. **Pricing** — 3 cards (Starter / Pro / Enterprise custom). Monthly/Annual toggle (~20% off annual) and INR/USD currency toggle, both client-side state. Pro card has a highlighted border + "MOST POPULAR" badge. Each card: name, tagline, price, credits + seats line, CTA button, feature checklist. Footnote explaining credits.
11. **About** — mission paragraph + 3 pillars (Speed, Brand consistency, Scale), each with a colored top border (blue/indigo/teal).
12. **FAQ** — 6-item accordion (single-open), chevron rotates 180° on open.
13. **Final CTA band** — gradient panel (navy→indigo), headline + two buttons (Start free trial / Talk to sales).
14. **Footer** — logo+tagline+domain, 3 link columns (Product, Company, Legal), copyright line.

## Interactions & Behavior
- **Pricing toggles**: two independent 2-state toggles (billing cycle: monthly/annual; currency: INR/USD) recompute the displayed price and period label for the two paid plans; Enterprise always shows "Custom" / "Contact sales".
- **FAQ accordion**: single-open-at-a-time, click question to expand/collapse, chevron icon rotates.
- **Hero & demo videos**: hero video autoplays muted/looped/inline (ambient, no controls); demo section video has standard controls, user-initiated playback.
- **All CTA buttons must not text-wrap** — fixed-width pill buttons, `white-space: nowrap`.
- No page-level JS routing beyond in-page anchor scrolling (`#features` etc.) — real router only needed for landing vs. login vs. app, per "Where this plugs in" above.

## State Management
- `billingCycle`: `'monthly' | 'annual'`, default `'monthly'`.
- `currency`: `'INR' | 'USD'`, default `'INR'`.
- `faqOpenIndex`: number, `-1` = none open.
- Plan and FAQ content can stay as static local data (see design file) until real plan data is available from `apps/api`.

## Design Tokens
**Colors** (from the existing app's Tailwind palette, `src/mockData.ts` brandColors):
- Primary blue: `#2563EB` / hover `#1D4ED8` / light `#60A5FA`
- Indigo accent: `#6366F1` / light `#A5B4FC`
- Teal accent: `#14B8A6` / `#2DD4BF`
- Background deep: `#0B1120`; band background: `#0F172A`
- Text: primary `#F8FAFC`, secondary `#94A3B8`, tertiary `#64748B`
- Borders: `rgba(255,255,255,0.08)`; card fill `rgba(255,255,255,0.03)`
- Success/check: `#34D399`; muted X: `#64748B`

**Typography**: Inter, weights 400–800. H1 `clamp(36px,5.2vw,64px)` weight 800. H2 `clamp(28px,3.4vw,40px)` weight 800. Body 14–19px, secondary text `#94A3B8`.

**Radius**: cards 16–20px, buttons 10–12px, pills 999px.

**Spacing**: section vertical padding ~80px, max content width 1180px (900px for narrower sections), grid gap 24px.

## Logo
Final mark, in `design/LumoraOS Logo Options.dc.html` option **8a "Spark"**: a solid circle (radial gradient `#3B82F6` → `#1D4ED8`) containing a single original 8-point abstract spark/asterisk (4 white rounded bars at 0°/45°/90°/135° through the center). Used at 32px in nav, 26px in footer, and as the page favicon (inline SVG data URI in the design file's `<head>` — copy that exact markup for the favicon). It is an **original mark** — not a reproduction of any third-party logo.

## Assets
- `design/assets/lumora-brand-ad.mp4` — hero background video (real asset, copied from `contentosai/public/videos/lumora-brand-ad.mp4`).
- `design/assets/lumora-tutorial.mp4` — demo section video (real asset, copied from `contentosai/public/videos/lumora-tutorial.mp4`).
- Trust-strip customer logos: **not provided** — currently dashed placeholders labeled "LOGO"; get real logos (with permission) before launch, or remove the section.
- All icons are hand-built inline SVGs (simple line icons), no icon library dependency required, but the rest of the app uses `lucide-react` — consider swapping to lucide icons for consistency if preferred.

## Files
- `design/LumoraOS Landing.dc.html` — full landing page design reference (open directly in a browser to view/interact).
- `design/LumoraOS Logo Options.dc.html` — logo exploration/history; final mark is option 8a near the bottom of the file.
