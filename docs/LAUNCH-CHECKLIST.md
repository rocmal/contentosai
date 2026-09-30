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
