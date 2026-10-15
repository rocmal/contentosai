---
name: deploy
description: Deploy contentosai (Lumora OS, lumoraos.in) to production - push to main, watch the GitHub Actions pipeline through test/build/deploy/health-check, diagnose failures, and roll back if needed. Use whenever the user asks to deploy, ship, release, push to prod, redeploy, or roll back this project.
---

# Deploy contentosai to production

This is a thin operational wrapper around a real pipeline that already
exists in this repo - it does not reimplement anything. The full
architecture, one-time server setup, and troubleshooting history live in
[`deploy/README.md`](../../../deploy/README.md); the pipeline itself is
[`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml).
**If anything below seems to contradict those files, the files win** -
re-read them, this skill can drift out of date, they're the source of
truth.

**How it actually works**: `main` is the only branch and the production
branch. Every push to `main` triggers `deploy.yml`: lint + unit/integration/
e2e tests for both apps → build & push Docker images to GHCR → sync
`deploy/` to the VPS over SSH → `remote-deploy.sh` on the server (pull
images, migrate, seed, recreate containers with a health-gated wait,
auto-rollback the containers if that fails) → an end-to-end curl health
check against `https://lumoraos.in`. There is no PR/review gate - a push
to `main` deploys. Manual re-deploy or rollback (without a new commit) is
`workflow_dispatch` with an optional `rollback_to` short-SHA.

## 0. Preflight

```
gh auth status
```
If not logged in, **stop and tell the user** to run `gh auth login`
themselves (browser OAuth) - this is a one-time interactive step that
can't be scripted, and never ask the user to paste a token into chat.

## 1. Look at what you're about to deploy

```
git status
git log origin/main..HEAD --oneline   # commits not yet on origin/main, if on main
```

- If there are **uncommitted changes**, review them like any commit
  (`git status`, check diffs) - don't blanket `git add -A`. This repo's
  working tree commonly carries unrelated noise that should **not** be
  swept into a deploy commit: `ai-services/redis-win/dump.rdb` (local
  Redis runtime state) and `ai-services/SadTalker` / `ai-services/Wav2Lip`
  submodule pointer changes (untracked local submodule content) have both
  shown up as dirty before with zero relation to actual app changes.
  Stage only what's actually part of the change being deployed.
- If work is on a **different local branch**, confirm with the user
  before merging into `main` - pushing to `main` deploys immediately with
  no review step, so this is the actual point of no return, not the
  `git push` itself.
- If the user just wants to **redeploy the current `main`** with no new
  commit (e.g. after a server-side change), skip straight to the
  `workflow_dispatch` trigger in step 4 instead of pushing.

## 2. Push

```
git push origin main
```

This alone triggers the full pipeline. Nothing else needs to happen on
your end to "start" a deploy.

## 3. Watch it through - don't fire-and-forget

The full run (tests + Docker builds + SSH deploy + health-check retries)
takes several minutes. Watch it in the background and report back rather
than stopping after the push:

```
gh run watch $(gh run list --workflow=deploy.yml -L 1 --json databaseId -q '.[0].databaseId') --exit-status
```

Run this via a backgrounded Bash call (`run_in_background: true`) so you
can keep working, and read its output when it completes.

## 4. On success

The workflow's own last step already did an end-to-end health check
against `https://lumoraos.in/api/health` and `/api/v1/health` - a green
run means it's live and healthy. Report the run URL
(`gh run view <id> --web` gives it, or read it from the `gh run watch`
output) and the deployed short SHA (`prepare` job output, or just
`git rev-parse --short HEAD`).

## 5. On failure - diagnose, don't blindly retry

```
gh run view <run-id> --log-failed
```
gives the failing step's log directly - far more reliable than the GitHub
web log viewer's search (see `deploy/README.md`'s note on this).

Sort the failure before acting:
- **Real test/build failure** (a specific assertion, a type error, a
  failed migration) → this is a genuine bug introduced by the change.
  Fix it, commit, push again. Never rerun a real failure hoping it passes.
- **Transient/infra-shaped** (runner timeout, a registry hiccup, a
  network blip with no code implicated) → safe to retry as-is:
  `gh run rerun <run-id> --failed`.
- **The `deploy` job's SSH step fails specifically** → treat this as a
  server/secrets problem, the same class as the wrong-SSH-account bug
  documented in `deploy/README.md`'s "Known issues" (already fixed once,
  but the same symptom - `id`/`HOME` diagnostic output at the top of the
  "Sync deploy/ to the VPS" step tells you immediately whether the SSH
  session is landing on the right account). Don't just rerun this
  category without checking that diagnostic output first.

## 6. Rollback

Only do this when the user actually asks for a rollback (or confirms one)
- it's a distinct, more surprising action than "deploy my current work,"
so don't infer it from a failed deploy on its own (a failed deploy's own
containers are already auto-rolled-back by `remote-deploy.sh` - see
below).

Find a good target SHA: `gh run list --workflow=deploy.yml --status success -L 10`
(commit SHAs of recent successful deploys), or check image tags in the
GHCR Packages tab.

```
gh workflow run deploy.yml -f rollback_to=<short-sha>
```
This skips build/test entirely and redeploys that exact existing image -
watch it the same way as step 3.

**Note**: a deploy whose health-gated container recreation fails is
*already* automatically rolled back to the last known-good image by
`remote-deploy.sh` on the server - this manual path is for rolling back a
release that *did* go live but turned out to be bad after the fact.

Rollback never touches the database (no down-migrations - see the
comment header in `deploy/scripts/rollback.sh` for why that's deliberate).
If a rollback needs an actual schema reversal, that's a manual, deliberate
DB action - never script it.

## Guardrails

- **Never read, print, or transmit the contents of `.env.production` or
  `apps/api/.env.production`.** They are created by hand on the server. The
  one thing CI does to `apps/api/.env.production` is the "Apply managed
  keys" step: it upserts only the non-empty GitHub secrets/variables listed
  in `deploy.yml` (vendor keys, SMTP, etc.) - see `deploy/README.md`,
  "Managing vendor keys from GitHub". Manage keys there, not in chat.
- This skill only drives things from the GitHub/git side (push, watch,
  rerun, rollback via `workflow_dispatch`). It does not SSH into the VPS
  directly - if `gh`/CI itself is unusable, that's a different, higher-risk
  situation (see `deploy/README.md`'s manual-deploy notes from the first
  ever deploy to this server) and needs the user's explicit sign-off
  before doing anything by hand on the box.
