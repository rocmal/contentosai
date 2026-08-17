# Deploying contentosai (Lumora OS) to the GoDaddy cPanel VPS

**Status: LIVE, migrated to a new server 2026-08-17.** https://lumoraos.in
runs on a brand-new VPS as of this date - the original server
(`192.169.177.255`, user `lumoosr`) is no longer in use for this project.
Everything below describes the **current** server. **Two items are open
right now** - see "Known issues" near the bottom - fix both before
treating this deployment as fully done:
1. MySQL has no firewall in front of it (security).
2. CI cannot currently deploy here - the first deploy was done manually.
   `VPS_SSH_USERNAME` needs re-verifying (see "Known issues").

Domain: **https://lumoraos.in** (single domain, path-based split - see
"Architecture" below). Repo: `git@github.com:rocmal/contentosai.git`.
cPanel user: `lumoraos`, home `/home/lumoraos`. VPS: `64.202.185.157`,
SSH port `22`, AlmaLinux 10.2. This server runs **real Apache httpd**
(confirmed via `ps aux` showing `/usr/sbin/httpd`, and via `httpd -M`) -
unlike the previous server, which turned out to be LiteSpeed. Don't
assume either way on a future migration - check both by identifying the
running process, same as here.

This directory (`deploy/`) is the entire ops footprint: a production
`docker-compose.yml` that runs the two prebuilt app images, the Apache
reverse-proxy config, and the scripts CI uses to actually deploy. Nothing
here builds anything - images are built once in GitHub Actions and pulled
from GHCR (`ghcr.io/rocmal/contentosai-web` / `contentosai-api`).

## Architecture

```
Browser ─▶ Apache (cPanel, HTTPS/443) ─┬─ /api/v1/*, /storage/uploads/* ─▶ 127.0.0.1:3000 → api container (network_mode: host) ─▶ host MySQL (3306) + host Redis/Valkey (6379)
                                       └─ everything else               ─▶ 127.0.0.1:3100 → web container (bridge + port mapping)
```

- **web** (repo root, `Dockerfile`) - Express server (`server.ts`) serving
  the built Vite SPA + its own legacy, unversioned `/api/*` AI routes
  (`/api/health`, `/api/generate`, `/api/brand-brain/extract`,
  `/api/copilot`, `/api/agents/run`). Normal bridge network, port-mapped
  to `127.0.0.1:3100`.
- **api** (`apps/api/Dockerfile`) - the real NestJS backend, prefix
  `/api/v1`, plus static file serving at `/storage/uploads/*`. BullMQ
  workers and the credits-renewal "cron" run **in-process** inside this
  same container (see `apps/api/src/queues`) - there is no separate worker
  container and no OS-level cron job anywhere in this stack. Runs with
  `network_mode: host` (not the bridge+port-mapping pattern `web` uses) -
  chosen because it makes reaching host MySQL/Redis trivial (`127.0.0.1`
  from inside the container really is the host) regardless of what
  bind-address either service happens to be configured with. `APP_HOST`
  is hard-pinned to `127.0.0.1` in `docker-compose.yml` for this reason -
  host networking removes the bridge network's built-in isolation, so a
  wrong bind address here would be a real public exposure.
- Apache is the only thing exposed to the internet on 80/443. `web` is
  loopback-only via its port mapping; `api` is loopback-only via the
  `APP_HOST` pin above.

**Why path-based on one domain, not a subdomain**: `apps/api`'s own routes
already live under the versioned `/api/v1` prefix, and the web app's
legacy AI routes are unversioned `/api/*` - so splitting the proxy on
`/api/v1` (not a generic `/api/*`) sends each request to the right
container with zero application code changes and no new DNS/subdomain
needed.

**`APP_URL` in `apps/api/.env.production` must be `https://lumoraos.in`**,
not a subdomain - every uploaded file's public URL is built as
`{APP_URL}/storage/uploads/{key}` (`LocalStorageProvider.getUrl()`), so a
wrong value here produces broken image/video URLs in the UI even though
everything else works. Same applies to `META_REDIRECT_URI`,
`LINKEDIN_REDIRECT_URI`, `YOUTUBE_REDIRECT_URI` - all should be
`https://lumoraos.in/api/v1/...`. Hit this exact bug on the previous
server (`APP_URL` had been set to a nonexistent `api.lumoraos.in`
subdomain, left over from an earlier architecture plan) - double-check it
after any future server migration, since it's easy to carry a stale value
forward in the copied `.env.production` file.

## SSH access setup

Two different keys, two different purposes - don't conflate them:

- **Personal interactive access**: cPanel's own generated key (or a
  password, for a freshly created cPanel account), for a human logging in
  from a terminal.
- **CI deploy access**: a dedicated, passphrase-free ed25519 keypair,
  reused across server migrations - `appleboy/ssh-action` (used by the CI
  workflow) has no way to supply a passphrase, so a personal
  passphrase-protected key must never go into the `VPS_SSH_PRIVATE_KEY`
  GitHub secret. When migrating to a new server, you do NOT need to
  generate a new keypair - just append the same public key
  (`~/.ssh/contentosai_deploy_ci.pub`) to the new server's
  `~/.ssh/authorized_keys` and leave the GitHub secret as-is. Only
  regenerate if the key is ever actually compromised.
  ```sh
  ssh-keygen -t ed25519 -f ~/.ssh/contentosai_deploy_ci -N "" -C "github-actions-deploy@contentosai"
  ```

If a key won't authenticate even though it looks correctly installed,
check on the server: `~/.ssh` should be `700` and `~/.ssh/authorized_keys`
should be `600`, both owned by the login user - SSHD silently refuses to
use `authorized_keys` if permissions are too open, which looks identical
to "the key just doesn't work" from the client side.

## One-time root/admin setup

Everything below needs root or WHM access, done **once** per server. On
this server (unlike the previous one, where most of this turned out to
already be fine), root access was available and used directly - all four
items below genuinely needed it this time.

### 1. Docker access for `lumoraos`

```sh
usermod -aG docker lumoraos
```
Needed here (the previous server happened to already have this set up;
this one didn't). Takes effect on the next SSH connection, no logout
required for a fresh session.

### 2. Redis/Valkey

Not installed at all on this server (RHEL-family distros, including
AlmaLinux 10, moved to **Valkey** - a drop-in Redis fork - as the default
package after Redis's 2024 license change; there is no `redis` package in
the AppStream repo, only `valkey`):
```sh
dnf install -y redis 2>/dev/null || dnf install -y valkey
systemctl enable --now valkey
```
No bind-address or firewall change was needed for this - the default
config already binds to `127.0.0.1:6379`, which is exactly what `api`'s
`network_mode: host` needs. Verified with a real test, not assumed:
```sh
docker run --rm --network host alpine sh -c \
  'apk add --no-cache netcat-openbsd >/dev/null 2>&1; nc -zv -w3 127.0.0.1 6379'
```

### 3. Host MySQL access from Docker

Already bound to `0.0.0.0:3306` (cPanel's default), and reachable from a
host-networked container (verified the same way as Redis above, port
3306). **Unlike the previous server, this one has no firewall blocking
public access to it at all** - see "Known issues" below, this is not yet
resolved.

### 4. Apache reverse proxy

`httpd -M | grep proxy` needs root to run, but the definitive test is
empirical anyway: after deploying the `.htaccess` rules (see below) with
no containers running yet, `curl https://lumoraos.in/` returned a clean
`503` (proxy works, nothing listening) rather than `500` (proxy broken) -
confirms mod_proxy is loaded and the rules are syntactically valid,
without needing to inspect Apache's module list directly.

## `.htaccess` deployment

Same file as `deploy/apache/htaccess.fallback` in the repo, appended
(never overwrite - preserve cPanel's auto-generated PHP-ini block at the
top) to `~/public_html/.htaccess`, with the existing file backed up first
as `.htaccess.bak-<timestamp>`. **This file is hand-maintained per
server and is not touched by `git push` or CI** - after any future server
migration, or whenever `deploy/apache/htaccess.fallback` changes in the
repo, the live file must be manually re-copied, or they silently drift
(this happened once already on the previous server - a stale port number
survived a `network_mode` change and caused requests to silently route to
the wrong container instead of erroring).

The WHM Include Editor / userdata vhost method
(`deploy/apache/lumoraos.in.conf`) remains available as a more robust
alternative when root access is convenient - survives cPanel's own config
rebuilds, unlike `.htaccess`. Use only one method, never both.

## One-time secrets setup

These files are **never** touched by CI - created once, by hand, on the
server, and they stay there across every deploy. When migrating servers,
copy the existing files over (via `scp`) rather than starting from the
`.example` templates, then update just what actually changed for the new
server (DB credentials, any server-specific values) - don't retype
secrets that didn't change.

```sh
mkdir -p /home/lumoraos/apps/contentosai/apps/api
# real GEMINI/OpenAI/DB/JWT/etc. secrets go in these two files, nowhere else.
# Double-check APP_URL and the *_REDIRECT_URI values are https://lumoraos.in
# - see the note under Architecture above.
nano /home/lumoraos/apps/contentosai/.env.production
nano /home/lumoraos/apps/contentosai/apps/api/.env.production
```

Then run the bootstrap script (idempotent, safe to re-run) to lay out the
rest of the directory structure and the compose-level `deploy/.env`:

```sh
mkdir -p /home/lumoraos/apps/contentosai/deploy
scp -r deploy/* lumoraos@<host>:/home/lumoraos/apps/contentosai/deploy/
ssh lumoraos@<host> '/home/lumoraos/apps/contentosai/deploy/scripts/setup-vps.sh /home/lumoraos/apps/contentosai'
```

## GitHub configuration

**Secrets** (Settings → Secrets and variables → Actions → Secrets -
ideally scoped to a `production` Environment, see below):

| Secret | Value |
|---|---|
| `VPS_SSH_HOST` | `64.202.185.157` |
| `VPS_SSH_PORT` | `22` |
| `VPS_SSH_USERNAME` | `lumoraos` |
| `VPS_SSH_PRIVATE_KEY` | The dedicated CI deploy key - see "SSH access setup" above. Unchanged across the server migration - same key, newly authorized on the new server. |
| `GHCR_PAT` | Fine-grained or classic PAT, `read:packages`/Packages-read-only scope. Unchanged across server migrations - unrelated to which VPS is being deployed to. |

**Variables** (same location, "Variables" tab - not secret, just config):

| Variable | Value | Purpose |
|---|---|---|
| `DEPLOY_PATH` | `/home/lumoraos/apps/contentosai` | Where `deploy/` gets rsynced to and `docker compose` runs from |
| `APP_ORIGIN` | `https://lumoraos.in` | Baked into the web build as `VITE_API_URL`; also the post-deploy health-check target. Unchanged across server migrations - it's the domain, not the server. |

Recommended (not yet done): create a `production` GitHub Environment and
move the secrets there instead of the repo level - lets you add required
reviewers (manual approval before every deploy) later without changing
the workflow.

## Deploying

Push to `main` (the only branch in this repo, and its production branch) -
`.github/workflows/deploy.yml` runs tests, builds both images, pushes them
to GHCR tagged with the short commit SHA + `latest`, then deploys.

Manual redeploy of the current `main`: Actions → "Deploy (Docker)" → Run
workflow, leave "rollback_to" empty. Useful when nothing about the app
code needs to change but the target server does (e.g., right after a
server migration, once secrets/DNS/GitHub config are all updated).

**Debugging a failed run**: the GitHub web log viewer's search doesn't
reliably find text in long logs, and the check-runs annotations API is
empty for plain Jest failures (only tools with dedicated GH Actions
problem-matchers, like `tsc`/`eslint`, get annotations). The reliable
method: on the failed run's summary page, click the gear icon → "Download
log archive", extract the zip, and grep the per-job `.txt` files directly.

## Rollback

Two ways, both restore containers only - **not** a database
down-migration (see the comment header in `deploy/scripts/remote-deploy.sh`
for why that's deliberately not automated):

1. **From GitHub**: Actions → "Deploy (Docker)" → Run workflow → fill in
   `rollback_to` with a previous short SHA (visible in the Packages tab
   for either image, or previous workflow run logs). Skips build/test
   entirely and redeploys that exact existing image.
2. **From the VPS directly**:
   ```sh
   cd /home/lumoraos/apps/contentosai/deploy
   ./scripts/rollback.sh            # back to the last known-good tag
   ./scripts/rollback.sh <sha>      # or a specific one
   ```

`remote-deploy.sh` also does this **automatically** if a deploy's health
check fails after the containers are recreated - see its comments for the
exact sequence (migrate on the new image first, before touching any
running container, so a bad migration never even reaches the swap step).

## Server migration checklist

Reference list for the next time this moves servers (based on what
actually changed migrating off `192.169.177.255`/`lumoosr` onto
`64.202.185.157`/`lumoraos`):

- [ ] Confirm root/WHM access on the new server - determines whether
      setup can be done directly or needs a support ticket / workaround.
- [ ] Identify the actual web server (`ps aux | grep -iE 'httpd|litespeed'`)
      - don't assume it matches the old one.
- [ ] Docker: confirm the deploy user is in the `docker` group.
- [ ] MySQL: confirm reachable from a host-networked container, AND
      confirm a firewall actually blocks public access - being bound to
      `0.0.0.0` is necessary but not sufficient.
- [ ] Redis/Valkey: confirm installed (may need installing from scratch)
      and reachable from a host-networked container.
- [ ] Copy `deploy/` and both `.env.production` files to the new server
      (`setup-vps.sh`), updating only what actually changed (DB
      credentials are almost always different on a fresh MySQL instance).
- [ ] Deploy the `.htaccess` proxy rules to the new server's
      `public_html` (append, don't overwrite).
- [ ] Update GitHub: `VPS_SSH_HOST`, `VPS_SSH_USERNAME`, `DEPLOY_PATH`.
      `VPS_SSH_PRIVATE_KEY`/`GHCR_PAT`/`APP_ORIGIN` don't need to change.
- [ ] Update DNS (A record) to the new IP. Keep the old server running
      until propagation completes if a clean cutover matters.
- [ ] Trigger a manual redeploy (Actions → Run workflow) rather than
      waiting for an unrelated code push.
- [ ] AutoSSL needs to reissue a certificate for the new server once DNS
      resolves to it - not instant, check cPanel → SSL/TLS Status if
      HTTPS doesn't work shortly after cutover.

## Known issues

### MySQL is not firewalled on the current server (open as of 2026-08-17)

Port 3306 is bound to `0.0.0.0` (needed for the Docker container to reach
it) but, unlike the previous server, **nothing is currently blocking
public internet access to it** - confirmed with a direct external
connection test. Neither CSF nor firewalld was found active on this box.

**This needs fixing** - either install and configure CSF (matches the
convention other servers in this environment likely use) or enable
firewalld, with a rule allowing MySQL only from `127.0.0.1` and the
Docker bridge/host-network path, blocking everyone else. An immediate
raw-iptables stopgap (not persistent across reboots - a real firewall
still needs setting up after):
```sh
iptables -I INPUT -p tcp --dport 3306 -s 127.0.0.1 -j ACCEPT
iptables -I INPUT -p tcp --dport 3306 -i docker0 -j ACCEPT
iptables -I INPUT -p tcp --dport 3306 -j DROP
```
Re-test after any fix: `nc -zv -w3 <server-ip> 3306` from a machine
outside the server - should refuse/time out, not connect.

### CI cannot currently deploy - wrong SSH account (open as of 2026-08-17)

`.github/workflows/deploy.yml`'s deploy job authenticates successfully
(the SSH key works) but as the **wrong cPanel account** - not `lumoraos`.
Confirmed with a diagnostic added to the sync step (`id; echo HOME=$HOME`
before doing anything else): the CI run showed a different `uid` than
`lumoraos` has when reached directly over SSH (uid 1267 in CI vs. uid
1010 for a real `lumoraos` session). This is why the sync step failed
with `mkdir: cannot create directory '/home/lumoraos': Permission
denied` / `No such file or directory` even though the target directory
demonstrably exists and is writable by `lumoraos` - cPanel's CageFS makes
other accounts' home directories genuinely not exist (not just
access-denied) from a different account's session, which is exactly the
symptom.

**Fix**: re-verify the `VPS_SSH_USERNAME` GitHub secret is exactly
`lumoraos`, character for character. If it already looks right, the CI
deploy key (`~/.ssh/contentosai_deploy_ci.pub`) may have ended up
appended to a *different* account's `authorized_keys` too (e.g. while
troubleshooting as root) - check every account's `authorized_keys` on the
server for that key's comment (`github-actions-deploy@contentosai`) and
remove it from anywhere that isn't `lumoraos`.

The sync mechanism itself (a single `ssh`+`tar` stream, see the "Sync
deploy/ to the VPS" step) is confirmed correct by direct manual testing -
this is purely a "wrong account" problem, not a bug in the approach. The
**first deploy to this server was done manually** as a result (`docker
compose pull` + `deploy/scripts/remote-deploy.sh latest`, run directly
over SSH as `lumoraos`, using images the CI run had already successfully
built and pushed). Future deploys should go back through `git push` once
this secret is fixed and a real CI run succeeds end to end - don't make
manual deploys the norm.
