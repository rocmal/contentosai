# Deploying contentosai (Lumora OS) to the GoDaddy cPanel VPS

**Status: LIVE as of 2026-08-12.** https://lumoraos.in is up and serving
real traffic through the pipeline described here. One operational issue
is currently open - see "Known issues" near the bottom - everything else
is done and working.

Domain: **https://lumoraos.in** (single domain, path-based split - see
"Architecture" below). Repo: `git@github.com:rocmal/contentosai.git`.
cPanel user: `lumoosr`, home `/home/lumoosr`. VPS: `192.169.177.255`,
SSH port `22`. This server runs **LiteSpeed Web Server**, not stock
Apache, even though cPanel's UI calls it "Apache" throughout (normal for
LiteSpeed+cPanel setups - LSWS reads the same config format).

This directory (`deploy/`) is the entire ops footprint: a production
`docker-compose.yml` that runs the two prebuilt app images, the Apache
reverse-proxy config, and the scripts CI uses to actually deploy. Nothing
here builds anything - images are built once in GitHub Actions and pulled
from GHCR (`ghcr.io/rocmal/contentosai-web` / `contentosai-api`).

## Architecture

```
Browser ─▶ LiteSpeed (cPanel, HTTPS/443) ─┬─ /api/v1/*, /storage/uploads/* ─▶ 127.0.0.1:3000 → api container (network_mode: host) ─▶ host MySQL (3306) + host Redis (6379)
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
  see "Host Redis access" below for why; it reaches MySQL/Redis via plain
  `127.0.0.1`, not `host.docker.internal`.
- LiteSpeed is the only thing exposed to the internet on 80/443. Both
  containers are only reachable via `127.0.0.1` - `web` because its port
  mapping is loopback-only, `api` because `APP_HOST` is hard-pinned to
  `127.0.0.1` in `docker-compose.yml` (host networking means a wrong bind
  address here would be a real public exposure, unlike the bridge
  network's built-in isolation - see the comments in that file).

**Why path-based on one domain, not a subdomain**: `apps/api`'s own routes
already live under the versioned `/api/v1` prefix, and the web app's
legacy AI routes are unversioned `/api/*` - so splitting the proxy on
`/api/v1` (not a generic `/api/*`) sends each request to the right
container with zero application code changes and no new DNS/subdomain
needed.

**`APP_URL` in `apps/api/.env.production` must be `https://lumoraos.in`**,
not `https://api.lumoraos.in` - the latter doesn't exist in this
architecture (it's a leftover from an earlier two-subdomain plan). Every
uploaded file's public URL is built as `{APP_URL}/storage/uploads/{key}`
(`LocalStorageProvider.getUrl()`), so a wrong value here produces broken
image/video URLs in the UI even though everything else works. Same
applies to `META_REDIRECT_URI`, `LINKEDIN_REDIRECT_URI`,
`YOUTUBE_REDIRECT_URI` - all should be `https://lumoraos.in/api/v1/...`.
Hit this exact bug 2026-08-12; fixed in both the local and server copies
of `apps/api/.env.production`, then the api container was recreated to
pick up the change (a plain restart does NOT re-read `env_file` - only a
recreate does).

## SSH access setup

Two different keys are in play, for two different purposes - don't
conflate them:

- **Personal interactive access**: cPanel's own generated key,
  passphrase-protected, downloaded via cPanel → SSH Access → Manage SSH
  Keys → View/Download. Fine for a human logging in from a terminal, but
  `appleboy/ssh-action` (used by the CI workflow) has no way to supply a
  passphrase, so this key must never go into a GitHub secret.
- **CI deploy access**: a dedicated, passphrase-free ed25519 keypair
  generated specifically for GitHub Actions. Its public half is appended
  to `lumoosr`'s `~/.ssh/authorized_keys` on the VPS (append, don't
  overwrite - other keys may already be authorized there). Its private
  half's full contents (including the `BEGIN`/`END` lines) are what goes
  into the `VPS_SSH_PRIVATE_KEY` GitHub secret. Generate with:
  ```sh
  ssh-keygen -t ed25519 -f ~/.ssh/contentosai_deploy_ci -N "" -C "github-actions-deploy@contentosai"
  ```
  then append `~/.ssh/contentosai_deploy_ci.pub`'s contents to the VPS's
  `authorized_keys`, and paste the private key file's contents into the
  GitHub secret.

If a cPanel-generated key won't authenticate even though it's shown as
"authorized" in the UI, check on the VPS (once logged in some other way):
`~/.ssh` should be `700` and `~/.ssh/authorized_keys` should be `600`,
both owned by `lumoosr` - SSHD silently refuses to use `authorized_keys`
if permissions are too open, which looks identical to "the key just
doesn't work" from the client side.

## One-time root/admin setup

Everything below needed root or WHM access at some point in this
project's history. As it turned out, only one of the four items actually
required it in the end - the rest were either already correctly
configured on this VPS or had a viable workaround. Kept here in full
because the same VPS runs other Dockerized sites, so this is a useful
reference for whoever administers it next, root or not.

### 1. Docker access for `lumoosr` - no action was needed

`lumoosr` was already in the `docker` group (this VPS already runs three
other Dockerized sites under this same account: `dialinida-image:v1` on
host port 8086, `vishwasimpex-app` on 8085, `ebharatmart-app` on 8084 -
none of them related to contentosai). `docker ps` and
`docker compose version` (v5.4.0) both worked without any setup.

### 2. Host MySQL access from Docker - no action was needed

Verified live:
- `bind-address=0.0.0.0` in `/etc/my.cnf` already (cPanel's default, for
  its own "Remote MySQL" feature).
- A throwaway container (`docker run --rm --add-host=host.docker.internal:host-gateway alpine nc -zv host.docker.internal 3306`)
  successfully reached it.
- Tested from an external machine (outside the VPS): port 3306 is
  correctly closed to the public internet. The existing firewall already
  does the right thing here.

Bridge subnet: `172.17.0.0/16`, gateway `172.17.0.1` (`docker network
inspect bridge`) - relevant only to `web`, which still uses the
`host.docker.internal`/bridge pattern; `api` doesn't (see below).

Optional defense-in-depth, doesn't need root - restrict the DB grant to
the bridge subnet instead of `%` if the existing user is currently
unrestricted:
```sql
CREATE USER IF NOT EXISTS 'lumoosr_os'@'172.17.0.0/255.255.0.0' IDENTIFIED BY '<same password as the existing user>';
GRANT ALL PRIVILEGES ON lumoosr_os.* TO 'lumoosr_os'@'172.17.0.0/255.255.0.0';
FLUSH PRIVILEGES;
```

### 3. Host Redis access from Docker - worked around, root fix optional

Redis is bound to `127.0.0.1:6379` only (loopback), and no sudo was
available to `lumoosr` to change that (`sudo -n -l` → "a password is
required"). **Fix applied**: `api` runs with `network_mode: host`
instead of the usual bridge+`host.docker.internal` pattern
(`deploy/docker-compose.yml`) - the container shares the host's network
namespace directly, so `127.0.0.1:6379` inside it genuinely is the
host's Redis, no bind-address change needed. This is live and working.

Trade-off accepted: `api` loses the bridge network's built-in port
isolation, mitigated by hard-pinning `APP_HOST=127.0.0.1` in the compose
file. If Redis's bind-address is ever fixed by someone with root, this
can be reverted to the `host.docker.internal` + port-mapping pattern
`web` still uses - not urgent, current setup works fine. The proper fix,
for reference:
```sh
ps aux | grep redis-server   # confirms the exact binary/config in use
```
Add the docker bridge gateway to `bind`, restart, and add a
`docker0`-scoped firewall rule (CSF example):
```
bind 127.0.0.1 172.17.0.1
```
```sh
# /etc/csf/csfpre.sh
iptables -I INPUT -i docker0 -p tcp --dport 6379 -j ACCEPT
```

### 4. Apache/LiteSpeed reverse proxy - fixed, turned out not to need root

This one looked like a root-only LiteSpeed/mod_proxy configuration issue
at first (a `[P]`-flag proxy rule returned a 500 for every request, and
`httpd -M` was permission-denied for `lumoosr`) - but the actual cause
was a bug in the `.htaccess` file itself: it included
`ProxyPreserveHost On`, which mod_proxy restricts to "server config,
virtual host" context only and can **never** be used in `.htaccess`,
regardless of permissions or which modules are loaded. Including it made
the entire file fail to parse - which is why even unrelated requests
also got a 500. Found via cPanel's **Metrics → Errors** page (surfaces
the error log even though the raw file isn't readable by `lumoosr` over
SSH), which showed the exact line: `.htaccess: ProxyPreserveHost not
allowed here`.

Fixed by deleting that one line. No root, no LiteSpeed WebAdmin change,
no support ticket needed in the end. Lesson for future `.htaccess`-based
proxy configs: `ProxyPreserveHost` and some other mod_proxy directives
are vhost-only - stick to `RewriteRule`, `RewriteCond`, and
`RequestHeader` (mod_headers) in `.htaccess` context.

The live `public_html/.htaccess` is a hand-maintained file (appended
below cPanel's own auto-generated PHP-ini block, never overwrite that
part) - **it is not touched by `git push` or CI**. Whenever
`deploy/apache/htaccess.fallback` changes in the repo, the live file on
the server must be manually updated to match, or they silently drift
apart (this happened once already - see "Known issues" history in
project memory for the port-drift incident).

The WHM Include Editor / userdata vhost method
(`deploy/apache/lumoraos.in.conf`) remains available as a more robust
alternative if root access is ever convenient to use - survives cPanel's
own config rebuilds, unlike `.htaccess`. If switching to it, remove the
appended block from `public_html/.htaccess` first - use only one method,
never both.

## One-time secrets setup

These files are **never** touched by CI - created once, by hand, on the
server, and they stay there across every deploy.

```sh
mkdir -p /home/lumoosr/apps/contentosai/apps/api
# Fill in real values - templates are .env.example (repo root) and
# apps/api/.env.example respectively. Real GEMINI/OpenAI/DB/JWT/etc.
# secrets go in these two files, nowhere else. Double-check APP_URL and
# the *_REDIRECT_URI values are https://lumoraos.in, not
# https://api.lumoraos.in - see the note under Architecture above.
nano /home/lumoosr/apps/contentosai/.env.production
nano /home/lumoosr/apps/contentosai/apps/api/.env.production
```

Then run the bootstrap script (idempotent, safe to re-run) to lay out the
rest of the directory structure and the compose-level `deploy/.env`:

```sh
mkdir -p /home/lumoosr/apps/contentosai/deploy
# (first time only - later deploys rsync this directory automatically)
scp -r deploy/* lumoosr@<host>:/home/lumoosr/apps/contentosai/deploy/
ssh lumoosr@<host> '/home/lumoosr/apps/contentosai/deploy/scripts/setup-vps.sh'
```

## GitHub configuration

**Secrets** (Settings → Secrets and variables → Actions → Secrets -
ideally scoped to a `production` Environment, see below) - all 5 are
entered and confirmed working as of 2026-08-12:

| Secret | Value |
|---|---|
| `VPS_SSH_HOST` | VPS hostname/IP |
| `VPS_SSH_PORT` | SSH port |
| `VPS_SSH_USERNAME` | `lumoosr` |
| `VPS_SSH_PRIVATE_KEY` | The dedicated CI deploy key - see "SSH access setup" above. Never the personal passphrase-protected one. |
| `GHCR_PAT` | Fine-grained or classic PAT, `read:packages`/Packages-read-only scope - used by the VPS to `docker login ghcr.io` and pull images. (Pushing from CI uses the automatic `GITHUB_TOKEN`, not this.) |

**Variables** (same location, "Variables" tab - not secret, just config)
- also entered and confirmed:

| Variable | Value | Purpose |
|---|---|---|
| `DEPLOY_PATH` | `/home/lumoosr/apps/contentosai` | Where `deploy/` gets rsynced to and `docker compose` runs from |
| `APP_ORIGIN` | `https://lumoraos.in` | Baked into the web build as `VITE_API_URL`; also the post-deploy health-check target |

Recommended (not yet done): create a `production` GitHub Environment and
move the secrets there instead of the repo level - lets you add required
reviewers (manual approval before every deploy) later without changing
the workflow.

## Deploying

Push to `main` (the only branch in this repo, and its production branch) -
`.github/workflows/deploy.yml` runs tests, builds both images, pushes them
to GHCR tagged with the short commit SHA + `latest`, then deploys.

Manual redeploy of the current `main`: Actions → "Deploy (Docker)" → Run
workflow, leave "rollback_to" empty.

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
   cd /home/lumoosr/apps/contentosai/deploy
   ./scripts/rollback.sh            # back to the last known-good tag
   ./scripts/rollback.sh <sha>      # or a specific one
   ```

`remote-deploy.sh` also does this **automatically** if a deploy's health
check fails after the containers are recreated - see its comments for the
exact sequence (migrate on the new image first, before touching any
running container, so a bad migration never even reaches the swap step).

## Known issues

### Stuck `contentosai-api-1` container blocks the next Compose deploy (open as of 2026-08-12)

While fixing the `APP_URL` bug above, `docker compose up -d --force-recreate --no-deps api`
left the old container in a `Dead` state that Docker cannot remove:
```
driver "overlay2" failed to remove root filesystem: unlinkat ...: device or resource busy
```
This is a known Docker/overlay2 edge case - the process is fully dead
(`docker inspect` shows `Pid: 0`), but the kernel still considers its
filesystem mount busy, for reasons that aren't visible from inside a
non-root Docker Engine client. Renaming the container doesn't help -
Compose tracks ownership via labels, not names, so it still tries to
replace the same stuck container and hits the same error.

**Current state**: service was restored via a bare
`docker run --name contentosai-api-manual --network host ...` using the
same image/env/volume as the Compose service, run directly rather than
through `docker compose`. This is a **temporary workaround, not a real
fix** - it works, but:
- **The next `docker compose up` (i.e., the next CI deploy) will almost
  certainly fail** trying to replace the still-stuck `contentosai-api-1`,
  and may also fail on a port conflict against `contentosai-api-manual`
  (both use `network_mode: host` on port 3000).
- Before pushing anything else, either resolve the stuck container or
  stop `contentosai-api-manual` and confirm the compose-managed
  container can start cleanly again.

**How to actually fix it**: this needs root. `systemctl restart docker`
would clear it, but that also restarts the other 3 unrelated sites on
this box (`dialinida-image`, `vishwasimpex-app`, `ebharatmart-app`) -
worth doing off-hours, or trying a more surgical fix first if root access
allows: identify what's holding `/var/lib/docker/overlay2/<id>/merged`
busy (`fuser -vm <path>` or `lsof | grep <id>`) and address that
specifically rather than restarting the whole daemon.
