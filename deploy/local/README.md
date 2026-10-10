# Local https://lumoraos.in

Runs the production setup on this PC: the same two app images, the same Apache path split, and real HTTPS with a
self-signed certificate. On this PC, `lumoraos.in` opens the local copy instead of the live site.

```
Browser ─▶ XAMPP Apache :443 (certs/lumoraos.in.crt) ─┬─ /api/v1/*, /storage/uploads/* ─▶ 127.0.0.1:3000  api
                                                       └─ everything else               ─▶ 127.0.0.1:3100  web
api ─▶ mysql (127.0.0.1:3307 from Windows) + redis (127.0.0.1:6379)      all in Docker, project "lumora-local"
```

## First time

Needs Docker Desktop and XAMPP in `C:\xampp`. In an **Administrator** PowerShell (the hosts file needs it):

```powershell
cd C:\xampp\htdocs\contentosai\deploy\local
.\setup.ps1
```

It creates `.env.api` / `.env.web` with random secrets, makes a certificate with XAMPP's OpenSSL and trusts it for your
Windows user (click **Yes** on the dialog), adds the vhost to XAMPP, points `lumoraos.in` at `127.0.0.1` in the hosts file,
and starts Docker (migrations and seeders run first). Then start **Apache** in the XAMPP Control Panel and open
https://lumoraos.in.

Demo logins: `admin@lumora.ai` / `Admin@12345`, `user@lumora.ai` / `User@12345`.

Firefox keeps its own certificate list: set `security.enterprise_roots.enabled` to `true` in `about:config`, or accept the warning.

## Switching between local and the live site

The hosts entry hides the real site on this PC. Switch it (Administrator PowerShell):

```powershell
.\setup.ps1 -Hosts off   # lumoraos.in = the live server again
.\setup.ps1 -Hosts on    # lumoraos.in = this PC
```

Phones and other computers are not affected.

## Everyday commands

```powershell
docker compose -f deploy/local/docker-compose.yml up -d --build   # rebuild after code changes (runs new migrations)
docker compose -f deploy/local/docker-compose.yml logs -f api
docker compose -f deploy/local/docker-compose.yml down             # stop (data is kept)
docker compose -f deploy/local/docker-compose.yml down -v          # stop and wipe the database and uploads
```

Database from Windows (HeidiSQL, Workbench, XAMPP's `mysql.exe`): host `127.0.0.1`, port `3307`, user `root`, password `root`, database `lumora`.

## AI keys and email

Image, video and voice generation need vendor keys. Paste them into `.env.api` (and `GEMINI_API_KEY` into `.env.web`), then
run `up -d` again. Every call is billed to the real vendor account. Without SMTP settings, emails such as forgot-password are not sent.

## Mobile app against the local stack

The phone does not use this PC's hosts file or trust its certificate. Point the app at the API over the LAN instead:
in `apps/mobile/.env` set `EXPO_PUBLIC_API_URL=http://<this PC's LAN IP>:3000`, and change the api port mapping in
`docker-compose.yml` from `127.0.0.1:3000:3000` to `3000:3000` while you test (this exposes the API to your network).
