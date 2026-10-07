# Launch checklist

Updated 2026-10-07 for the product as it now ships: **Image Studio, Video Studio, Voice Studio, Gallery,
Team, Calendar/publishing, Dashboard, Billing**. AI Studio, Brand Brain, Projects, Campaigns and Character
Studio are hidden (code kept). What the code does is covered by tests and CI; this list is the part only the
account owner can do or verify, because it lives in production secrets, third-party dashboards or business and
legal decisions.

## 0. Status at a glance

Working and verified on production (deploy log / live checks):
- Site, API health and database up; deploys are automatic on push to `main` (Docker workflow).
- Brevo SMTP logs in from the server (587 / 2525 / 465). Sender is on your own domain.
- OpenAI image key accepted; an image was generated end to end. Image Studio is OpenAI-only.
- Gemini key accepted (paid project). Veo video runs on the same key.
- Your owner account exists and is super-admin.
- Gallery, Team gallery, Creation history, global search (Ctrl+K), credit costs shown before generating,
  workspace-scoped media and publishing data, seats card on the dashboard.

Not yet verified or not done (all need you): see sections 1-3.

## 1. Must do before any public announcement

- [ ] **Retire the demo accounts.** `admin@lumora.ai` (super-admin) and `user@lumora.ai` still log in with
      passwords that were once printed on the login page. You are currently using the demo admin, so first
      make sure your own account (`puneetmehra24@gmail.com`) can sign in (use "Forgot password"), then:
      `UPDATE users SET status='suspended', deletedAt=NOW() WHERE email IN ('admin@lumora.ai','user@lumora.ai');`
      and delete their rows in `refresh_tokens`. The seeder no longer creates them in production.
- [ ] **Forgot-password email arrives** (check the inbox and spam). SMTP is confirmed working from the server;
      the end-to-end email has not been confirmed by you.
- [ ] **Razorpay in live mode**: `RAZORPAY_KEY_ID` (variable), `RAZORPAY_KEY_SECRET` and
      `RAZORPAY_WEBHOOK_SECRET` (secrets), webhook URL registered in the Razorpay dashboard. Make one real
      low-value purchase end to end and confirm the plan and credits update. KYC can take days.
- [ ] **One real Veo video.** Generate a short clip in Video Studio, check the credits taken (180) and the clip
      in the Gallery, then ask for the same prompt again and confirm it is free. Needs billing on the Google
      project behind the Gemini key.
- [ ] **Video "Save as template" fails** - no template has ever saved on production. Retry in Scene Builder and
      read the red message on the finished-video screen (the real reason is now shown), then fix.
- [ ] **Character Studio avatar pictures** showed as broken images (files and database values are fine).
      Hard refresh and report. The studio is hidden, so this is not a launch blocker.
- [ ] **Counsel** reviews the Privacy Policy and Terms (`/privacy`, `/terms`) and the landing-page answer
      "Who owns the content I generate?".
- [ ] Confirm `17499150` is the licence/agent number to show wherever the advisor line is used.

## 2. Vendor accounts and keys

Keys are set as GitHub secrets and written to the server by the deploy ("Apply managed keys"); never put
them in git or chat.

| Status | What | Notes |
| --- | --- | --- |
| Done | `GEMINI_API_KEY` (paid) | Text AI and Veo video. Add a budget alert and prepaid auto-reload in Google. |
| Done | `OPENAI_API_KEY` (+ `OPENAI_IMAGE_MODEL`) | Image Studio. The key may stay restricted to Images only. |
| Done | Brevo SMTP (`SMTP_*`, `BREVO_SMTP`) | Verified sender on your domain. |
| Confirm | `SARVAM_API_KEY` | Hindi/Punjabi writing and voices. The deploy log does not check it; confirm it is set. |
| Needed | Razorpay live keys | See section 1. |
| Optional | `ELEVENLABS_API_KEY` on a plan with instant voice cloning | Without it "Record your own voice" says it is not set up. Prices for ElevenLabs/Cartesia/Azure are placeholders. |
| Optional | `SENTRY_DSN` | Read from config but Sentry is not wired in; errors only reach container logs. |
| Needed to publish | Meta app (App Review), LinkedIn app, Google OAuth client (YouTube) | Until Meta approves the app, only tester accounts can connect Instagram/Facebook. |

### How billing works (what you can promise customers)

- Plans are paid **month by month with a one-off Razorpay payment - no auto-renewal.** If a month ends
  without a new payment the plan shows Expired and its credits are removed until renewed. The owner is
  emailed 3 days and 1 day before it ends, and when it lapses (needs working SMTP).
- Monthly only. Starter 1 seat, Pro up to 5, Enterprise unlimited. New signups get 150 free trial credits
  (`TRIAL_CREDITS`).
- Credit prices (target 50% margin on the Pro plan's credit): image 2 / 13 / 50 (OpenAI draft / standard /
  high); voice 7 credits per minute with Sarvam (1 with free Edge/Piper, 10 placeholder for others); AI video
  180 per 10 seconds (Veo 3.1 Fast). Only Sarvam, Veo and OpenAI prices are verified. All rates live in
  `apps/api/src/modules/credits/credits.constants.ts`, and the app shows the cost before voice and video
  generation from the same tables.
- Asking for the same video again (same prompt, length, format) returns the saved clip free.

## 3. Operations

- [ ] **Database backups** with a tested restore (production MySQL).
- [ ] **Uptime check** on `https://lumoraos.in/api/health`.
- [ ] **TRUST_PROXY**: set to 2 if a CDN such as Cloudflare sits in front of Apache.
- [ ] **Apache timeout**: long requests over 60 seconds fail with "Could not reach the Lumora API".
- [ ] **cPanel deploy workflow** fails on every push (malformed SSH key secret). The Docker deploy is
      unaffected; delete or fix the old workflow.
- [ ] GSTIN in Google billing; decide GST invoicing for customers.

## 4. Known limits (accepted for launch)

- Teammates can only be added if they already have a Lumora account (no email invitation flow yet).
- Unsaved Image Studio generations are not recorded; items saved before 2026-10-07 have no saved prompt, so
  they have no "Create again".
- The Gallery caps images and videos at 100 per person.
- WhatsApp publishing is not built; Image Studio only makes WhatsApp-sized pictures.
- Only the media and publishing endpoints have been audited for workspace ownership checks; other modules
  have not.
- AI output can contain mistakes (faces, text, numbers). The product says so; insurance content still needs
  your own compliance review before posting.

## 5. Smoke test on production (10 minutes)

1. Sign up with a fresh email: dashboard shows the three studio cards and 150 trial credits.
2. Forgot password: email arrives, link opens the reset page, sign in with the new password.
3. Image Studio: describe a picture, tick two platforms, generate, save one; it appears in Gallery.
4. Video Studio: pick a template, generate, watch it finish; repeat the same prompt and confirm it is free.
5. Voice Studio: generate a short Hindi voiceover; the button showed its credit cost first.
6. Gallery: rename an item, open Creation history, press "Create again" and confirm the studio opens with the prompt.
7. Press Ctrl+K, search for something you made, and open it.
8. Team: invite flow (needs a second account); on Starter the dashboard shows "Upgrade for more seats".
9. Billing: credits shown and each generation deducts what the button said. Buy Starter with a real payment.
10. Connect one social account, schedule a post, see it in Calendar, then disconnect.
