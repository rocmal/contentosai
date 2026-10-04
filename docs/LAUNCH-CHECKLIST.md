# Launch checklist

What the code now does is covered by the tests and the CI pipeline. This list is
the part only the account owner can do or verify, because it lives in production
secrets, third-party dashboards or legal/business decisions.

## 1. Must do before any public announcement

- [ ] **Retire the demo accounts on production.** `admin@lumora.ai` (super-admin) and
      `user@lumora.ai` were created by the demo seeder with passwords that were printed on
      the public login page (now removed). Treat both passwords as public.
      1. Create your real admin account through normal sign-up, then give it the
         `super-admin` role.
      2. Disable the demo accounts, e.g. `UPDATE users SET status='suspended', deletedAt=NOW()
         WHERE email IN ('admin@lumora.ai','user@lumora.ai');` and delete their
         rows in `refresh_tokens` so existing sessions stop working.
      3. The seeder no longer creates them when `NODE_ENV=production` (set
         `SEED_DEMO_DATA=true` only for a throwaway demo environment).
- [ ] **AI provider key** set on the server (`GEMINI_API_KEY` or whichever provider
      `AI_DEFAULT_PROVIDER` names). Without it every generation, agent run and the
      Co-pilot returns an error (by design - no fake output any more).
- [ ] **Email actually delivers.** Sign up with a real address and trigger "Forgot password".
      Check `SMTP_*` and that `SMTP_FROM` is a sender on your own domain (the default
      `no-reply@lumora.ai` is not your domain; set e.g. `no-reply@lumoraos.in` and add
      SPF/DKIM records, or messages will land in spam).
- [ ] **Razorpay in live mode**: live `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, the webhook
      URL registered in the Razorpay dashboard, and `RAZORPAY_WEBHOOK_SECRET` matching it.
      Make one real low-value purchase end to end and confirm credits/plan update.
- [ ] **Brand Brain saved** for your own workspace (Brand Brain -> Load template -> LIC ->
      Save Changes) before generating LIC content.

## 1b. Vendor accounts and keys (what to buy, in priority order)

Set keys as environment variables on the production server (`apps/api/.env.production`
on the host, never in git). The app reports which AI engines are configured on the
Integrations page.

| Priority | What | Why / which key | Notes |
| --- | --- | --- | --- |
| Required | **Text AI** - `GEMINI_API_KEY` (set `AI_DEFAULT_PROVIDER=gemini`) | Powers AI Studio, Agents, Co-pilot, website import | Use a **paid/billing-enabled** Google key, not the free tier (free-tier rate limits are far too low and free-tier prompts may be used to improve Google products - unsuitable for customer content). |
| Strongly recommended | **Sarvam AI** - `SARVAM_API_KEY` | Better Hindi / Punjabi / Indian-English writing and text-to-speech; one key covers chat and voice | The best fit for your LIC audience. |
| Required if you sell Image Studio | **One image vendor**: `OPENAI_API_KEY` (gpt-image) **or** `STABILITY_API_KEY` **or** `FLUX_API_KEY` | Image Studio, poster visuals | OpenAI is simplest; it also works as a text fallback. |
| Required | **Email (SMTP)**: Brevo / Amazon SES / Resend - `SMTP_*`, `SMTP_FROM` on your domain | Password reset, verification | Free tiers are enough to start. Add SPF + DKIM for lumoraos.in. |
| Required to take money | **Razorpay live account** (business KYC): `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | Checkout | KYC can take days - start now. Also decide GST invoicing. |
| Optional at launch | **Voice**: ElevenLabs (`ELEVENLABS_API_KEY`) | Premium English voices + cloning | The default free "Edge" voice uses an unofficial Microsoft endpoint - fine for demos, but switch to Sarvam / Azure / ElevenLabs before selling voice to customers. |
| Optional at launch | **AI video**: Veo (Google key) / Runway / Kling / Pika / Luma | Video Studio "create from prompt" | Expensive per clip. The Scene Builder (your own images + voice) needs **no video vendor**. Don't enable a paid video provider until credit costs are set so video is profitable (see `credits.constants.ts`). |
| Optional at launch | **Talking avatars**: D-ID or HeyGen (`DID_API_KEY` / `HEYGEN_API_KEY`) | Character Studio | Paid per minute. Skip for launch unless customers ask; the UI errors clearly without a key. |
| Recommended | **Sentry** (free tier) - `SENTRY_DSN` | Error alerts | Needs a small code change to wire in. |
| Needed for social publishing | Meta developer app (+ App Review), LinkedIn app, Google Cloud OAuth client (YouTube) | Scheduling/publishing | Free; approvals take time. |

Minimum to start selling LIC-style content: **Gemini (paid) + Sarvam + SMTP + Razorpay live**.
Add an image vendor if you sell Image Studio.

### How billing works today (important for what you promise customers)

- Plans are paid **month by month with a one-off Razorpay payment - there is no auto-renewal.**
  When the paid month ends without a new payment, the plan shows **Expired** and its
  remaining credits are removed until the customer renews (Billing page -> Renew).
  Previously the system silently re-granted credits every month without payment; that is fixed.
- Only monthly billing exists (the annual toggle was removed from the pricing page).
- New signups get **150 free trial credits** (was the full 2,500). Change with `TRIAL_CREDITS`.
- Automatic renewal reminders by email are **not built**; build them (or move to Razorpay
  Subscriptions / autopay) before you have many customers.
- Credit prices: a text generation is 1 credit; an image is 1 / 8 / 30 credits (OpenAI draft / standard / high) or 4 / 10 (Stability standard / high); voice ~1 credit per minute; video ~1 credit per 10 s (too low - see the cost document). Check
  these against your real vendor costs before relying on the Starter/Pro prices for margin.

## 2. Operations

- [ ] **Error monitoring.** `SENTRY_DSN` is read from config but Sentry is not wired into the
      app yet; today errors only reach the container logs. Decide whether to add it.
- [ ] **Database backups** with a tested restore (production MySQL).
- [ ] **TRUST_PROXY.** The API now trusts one reverse-proxy hop in production so rate
      limiting is per visitor rather than one shared bucket. If a CDN (e.g. Cloudflare) sits
      in front of Apache, set `TRUST_PROXY=2`.
- [ ] **API docs** (`/api/docs`) are off in production; set `SWAGGER_ENABLED=true` only if you
      want them public.
- [ ] **cPanel deploy workflow** fails on every push (`Error loading key "(stdin)": error in
      libcrypto`): the SSH private-key secret is malformed. The Docker deploy is unaffected.
- [ ] Uptime check on `https://lumoraos.in/api/health`.

## 3. Third-party approvals

- [ ] **Meta (Facebook/Instagram) publishing**: until the Meta app passes App Review, only
      accounts added as testers/admins on the app can connect. Start App Review before
      onboarding outside users.
- [ ] LinkedIn and YouTube OAuth apps: confirm they are approved for external users.
- [ ] WhatsApp sending is **not built**; it needs WhatsApp Business API access.

## 4. Content and legal

- [ ] Have your compliance reviewer read the LIC / insurance rules in Brand Brain
      (`src/lib/brandTemplates.ts`). The automated phrase scanner is a safety net, not a
      substitute for IRDAI / LIC approval of advertising.
- [ ] Privacy Policy and Terms of Service (`/privacy`, `/terms`) reviewed by counsel.
- [ ] Confirm `17499150` is the correct licence/agent number shown in the advisor footer.

## 5. Smoke test on production (10 minutes)

1. Sign up with a fresh email -> dashboard shows the "Get started" checklist.
2. Forgot password -> email arrives -> link opens the reset page -> sign in with the new password.
3. Brand Brain: load the LIC template, save, reload the page, confirm it persisted.
4. AI Studio: generate a Reel in Hindi -> footer shows the advisor line and disclaimer.
5. Compliance Reviewer agent: paste "Double your money, guaranteed returns" -> flagged.
6. Create a campaign and a project, save a draft to the project, see the count update.
7. Connect one social account, then disconnect it.
8. Check Billing shows credits and that a generation deducts one.
