# Deploying contentosai (Lumora OS) to the GoDaddy cPanel VPS

Domain: **https://lumoraos.in** (single domain, path-based split - see
"Routing" below). Repo: `git@github.com:rocmal/contentosai.git`. cPanel
user: `lumoosr`, home `/home/lumoosr`.

This directory (`deploy/`) is the entire ops footprint: a production
`docker-compose.yml` that runs the two prebuilt app images, the Apache
reverse-proxy config, and the scripts CI uses to actually deploy. Nothing
here builds anything - images are built once in GitHub Actions and pulled
from GHCR (`ghcr.io/rocmal/contentosai-web` / `contentosai-api`).

## Architecture

```
Browser ─▶ Apache/LiteSpeed (cPanel, HTTPS/443) ─┬─ /api/v1/*, /storage/uploads/* ─▶ 127.0.0.1:3000 → api container (network_mode: host) ─▶ host MySQL (3306) + host Redis (6379)
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
- Apache/LiteSpeed is the only thing exposed to the internet on 80/443.
  Both containers are only reachable via `127.0.0.1` - `web` because its
  port mapping is loopback-only, `api` because `APP_HOST` is hard-pinned
  to `127.0.0.1` in `docker-compose.yml` (host networking means a wrong
  bind address here would be a real public exposure, unlike the bridge
  network's built-in isolation - see the comments in that file).

**Why path-based on one domain, not a subdomain**: `apps/api`'s own routes
already live under the versioned `/api/v1` prefix, and the web app's
legacy AI routes are unversioned `/api/*` - so splitting Apache's proxy on
`/api/v1` (not a generic `/api/*`) sends each request to the right
container with zero application code changes and no new DNS/subdomain
needed.

## One-time root/admin setup

Everything below needs root or WHM access and is done **once**. `lumoosr`
cannot do any of this itself (no sudo).

### 1. Docker access for `lumoosr` - ALREADY DONE, verified 2026-08-12

No action needed - `lumoosr` was already in the `docker` group (this VPS
already runs three other Dockerized sites under this same account).
`docker ps` and `docker compose version` (v5.4.0) both work already.

### 2. Host MySQL access from Docker - ALREADY DONE, verified 2026-08-12

No action needed. Verified live on this VPS:
- `bind-address=0.0.0.0` in `/etc/my.cnf` already (cPanel's default, for
  its own "Remote MySQL" feature).
- A throwaway container (`docker run --rm --add-host=host.docker.internal:host-gateway alpine nc -zv host.docker.internal 3306`)
  successfully reached it.
- Tested from an external machine (outside the VPS): port 3306 is
  correctly closed to the public internet. CSF (or whatever firewall this
  box runs) is already doing the right thing here.

Bridge subnet confirmed: `172.17.0.0/16`, gateway `172.17.0.1` (`docker
network inspect bridge`) - matches every place this doc assumes that CIDR.

Still worth restricting the DB grant to the bridge subnet instead of `%`
if the existing user is currently unrestricted, as defense in depth:

```sql
CREATE USER IF NOT EXISTS 'lumoosr_os'@'172.17.0.0/255.255.0.0' IDENTIFIED BY '<same password as the existing user>';
GRANT ALL PRIVILEGES ON lumoosr_os.* TO 'lumoosr_os'@'172.17.0.0/255.255.0.0';
FLUSH PRIVILEGES;
```
This one doesn't need root - any user with `GRANT` privileges on
`lumoosr_os` can run it.

### 3. Host Redis access from Docker - WORKED AROUND 2026-08-12, root fix optional now

Verified live: Redis is running as `/usr/bin/redis-server 127.0.0.1:6379`
(loopback only) - a container on the normal bridge network could not
reach it via `host.docker.internal` (confirmed with the same `nc -zv`
test used for MySQL, which timed out). No sudo/root was available on this
account to fix Redis's bind-address (`sudo -n -l` → "a password is
required"), so **`api` now runs with `network_mode: host` instead**
(`docker-compose.yml`) - the container shares the host's network
namespace directly, so `127.0.0.1:6379` inside it genuinely is the host's
Redis, without needing Redis's bind-address changed at all. This is live
and working, not a documented-but-unapplied plan like the items below.

Trade-off accepted: `api` loses the bridge network's built-in port
isolation (mitigated by hard-pinning `APP_HOST=127.0.0.1` in the compose
file - see its comments). If Redis's bind-address is ever fixed by
someone with root, this can be reverted to the same
`host.docker.internal` + port-mapping pattern `web` still uses - the
proper fix, kept here for reference, would have been:

```sh
ps aux | grep redis-server   # confirms the exact binary/config in use
```
Edit whatever config file that process was started from, add the docker
bridge gateway to `bind`, restart, and add the same `docker0`-scoped CSF
rule MySQL already has:
```
bind 127.0.0.1 172.17.0.1
```
```sh
# /etc/csf/csfpre.sh
iptables -I INPUT -i docker0 -p tcp --dport 6379 -j ACCEPT
```

### 4. Apache reverse proxy - DEPLOYED, currently BROKEN (500), root needed to diagnose

`httpd -M`/`apachectl -M` as `lumoosr` returned "permission denied", and
`phpinfo()` revealed this box actually runs **LiteSpeed Web Server**, not
stock Apache (PHP compiled `--enable-litespeed`, Server API `CGI/FastCGI`
via LSAPI) - see the header comments in `deploy/apache/lumoraos.in.conf`
and `deploy/apache/htaccess.fallback` for the full finding. cPanel's UI
still calls this "Apache" throughout, which is normal for LiteSpeed+cPanel
setups (LSWS is a drop-in replacement that reads the same config format).

The `.htaccess` fallback **is already deployed** to `public_html/.htaccess`
(appended below cPanel's own PHP-ini block, original backed up alongside
it as `.htaccess.bak-<timestamp>`) and confirmed live-tested to return
`HTTP 500` for every request - confirmed (by fully removing the rules and
re-testing, which returned a clean `200`) that these specific rules are
the cause, not something else on the site. The real error log isn't
readable by `lumoosr` (`~/logs/` and `~/access-logs/` only have access
logs on this account), so the exact LiteSpeed error is still unknown.

**What's needed from root**: check the LiteSpeed/Apache error log for the
precise cause, and enable whatever LiteSpeed needs for `.htaccess`-level
`[P]`-flag proxy rewriting to work. Don't assume "enable mod_proxy in
EasyApache4" is the right instruction to give them - hand them the
symptom (500 on a `[P]` rewrite rule, confirmed via removal test) and let
them use root-level log access to find the actual cause; LiteSpeed's
equivalent may be a different setting entirely (e.g. in LiteSpeed
WebAdmin, not EasyApache 4).

Once whatever the real fix turns out to be is applied, the file already
in place should start working immediately - re-test with
`curl -sS -o /dev/null -w "%{http_code}\n" https://lumoraos.in/` (expect
`200` once containers are also running, or a clean `502` if containers
aren't up yet but proxying itself works) rather than assuming more
deployment work is needed.

The WHM Include Editor / userdata vhost method
(`deploy/apache/lumoraos.in.conf`) is the more robust alternative if/when
root access is available - survives cPanel's own config rebuilds, unlike
`.htaccess`:

```sh
mkdir -p /etc/apache2/conf.d/userdata/ssl/2_4/lumoosr/lumoraos.in
cp deploy/apache/lumoraos.in.conf /etc/apache2/conf.d/userdata/ssl/2_4/lumoosr/lumoraos.in/proxy.conf
/usr/local/cpanel/scripts/rebuildhttpdconf
/scripts/restartsrv_httpd
```
If switching to this method, remove the appended block from
`public_html/.htaccess` first - use only ONE of the two proxy methods,
never both.

## One-time secrets setup

These files are **never** touched by CI - create them once, by hand, on
the server, and they stay there across every deploy.

```sh
mkdir -p /home/lumoosr/apps/contentosai/apps/api
# Fill in real values - templates are .env.example (repo root) and
# apps/api/.env.example respectively. Real GEMINI/OpenAI/DB/JWT/etc.
# secrets go in these two files, nowhere else:
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
ideally scoped to a `production` Environment, see below):

| Secret | Value |
|---|---|
| `VPS_SSH_HOST` | VPS hostname/IP |
| `VPS_SSH_PORT` | SSH port |
| `VPS_SSH_USERNAME` | `lumoosr` |
| `VPS_SSH_PRIVATE_KEY` | Private key for a keypair whose public half is in `lumoosr`'s `~/.ssh/authorized_keys`. A dedicated passphrase-free deploy keypair was generated 2026-08-12 (`~/.ssh/contentosai_deploy_ci` locally) specifically for this - its public half is already appended to the VPS's `authorized_keys`. Don't reuse a personal passphrase-protected key here; `appleboy/ssh-action` can't unlock one, and CI has no way to supply a passphrase interactively anyway. |
| `GHCR_PAT` | Classic PAT, `read:packages` scope only - used by the VPS to `docker login ghcr.io` and pull images. (Pushing from CI uses the automatic `GITHUB_TOKEN`, not this.) |

**Variables** (same location, "Variables" tab - not secret, just config):

| Variable | Default if unset | Purpose |
|---|---|---|
| `DEPLOY_PATH` | `/home/lumoosr/apps/contentosai` | Where `deploy/` gets rsynced to and `docker compose` runs from |
| `APP_ORIGIN` | `https://lumoraos.in` | Baked into the web build as `VITE_API_URL`; also the post-deploy health-check target |

Recommended: create a `production` GitHub Environment and put the secrets
there instead of at the repo level - this lets you add required reviewers
(manual approval before every deploy) later without changing the workflow.

## Deploying

Push to `main` (the only branch in this repo, and its production branch) -
`.github/workflows/deploy.yml` runs tests, builds both images, pushes them
to GHCR tagged with the short commit SHA + `latest`, then deploys.

Manual redeploy of the current `main`: Actions → "Deploy (Docker)" → Run
workflow, leave "rollback_to" empty.

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

## Troubleshooting

- `docker compose up -d --wait` timing out → `docker compose logs -f api`
  (or `web`) on the VPS; check the container's `HEALTHCHECK` command
  directly with `docker inspect --format='{{json .State.Health}}' <container>`.
- API can't reach MySQL → the bind-address/firewall step above wasn't
  completed, or the docker bridge subnet isn't actually `172.17.0.0/16`
  on this box (`docker network inspect bridge` to confirm the real subnet
  before assuming the example CIDR above is correct). Doesn't apply to
  Redis - `api` reaches it via `network_mode: host`, not the bridge.
- 502 from Apache/LiteSpeed → containers aren't up, or `web` is listening
  on the wrong host port (`WEB_HOST_PORT` in `deploy/.env` must match
  `deploy/apache/lumoraos.in.conf`). For `api`, there's no `*_HOST_PORT`
  to check - it's always `127.0.0.1:3000` via host networking (confirm
  the container's actual `APP_PORT` matches if this ever changes).
- 500 from Apache/LiteSpeed → see "Apache reverse proxy" above - this is
  the currently-known, still-unresolved issue on this box as of
  2026-08-12, not a new problem to re-diagnose from scratch.
