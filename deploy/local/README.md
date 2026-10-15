# Local development and testing

Two modes share the same Docker MySQL and Redis (and so the same data):

| Mode | Use it for | Start | Open |
| --- | --- | --- | --- |
| **Dev** | Writing code: API, web and mobile reload on save | `.\dev.ps1` | http://localhost:3100 |
| **Production-like** | Final check before pushing: the real Docker images behind HTTPS | `.\dev.ps1 -Stop` | https://lumoraos.in |

Run `setup.ps1` once first (below). After that, everyday work is:

## The change → test → build loop

1. **Start dev mode**: `.\dev.ps1` (in `deploy/local`). Three windows open:
   - **API** (`apps/api`, `npm run start:dev`): http://localhost:3000/api/v1, restarts on every save.
   - **Web** (repo root, `npm run dev`): http://localhost:3100, the page updates as you save.
   - **Mobile** (`apps/mobile`, `npx expo start`): install **Expo Go** on the phone, join the same Wi-Fi as this PC and
     scan the QR code. The app talks to this PC's API (`http://<LAN IP>:3000`). The first time, allow Node.js through the
     Windows firewall (Private networks) when asked. Push notifications do not work in Expo Go; everything else does.
   Sign in with `admin@lumora.ai` / `Admin@12345`. Use `-NoMobile` to skip Expo.
2. **Make changes.** New database tables or columns need a migration (`npm run migration:generate -- <name>` in `apps/api`),
   never `sync()`. Re-run `.\dev.ps1` to apply new migrations, or `npm run db:migrate` in `apps/api`.
3. **Test:**
   ```powershell
   cd apps/api;    npm test; npx tsc --noEmit        # API unit tests and types
   cd ../..;       npm run lint                       # web types
   cd apps/mobile; npx tsc --noEmit; npx expo lint    # mobile
   ```
4. **Check the production build** (optional, for bigger changes): `.\dev.ps1 -Stop`, then
   `docker compose -f deploy/local/docker-compose.yml up -d --build` and try https://lumoraos.in. This is the same build CI makes.
5. **Ship the web app and API**: commit and push to `main`. GitHub Actions tests, builds and deploys to the live server.
6. **Build the mobile app** (EAS cloud builds, from `apps/mobile`):
   ```powershell
   npx eas-cli build --platform android --profile preview      # APK to install on a phone
   npx eas-cli build --platform android --profile production   # .aab for Google Play
   npx eas-cli build --platform ios --profile production       # App Store / TestFlight (asks for the Apple login the first time)
   ```
   Store builds use the live API (`https://lumoraos.in`), so ship the API first when a mobile change depends on it.
   **If you change mobile dependencies**, regenerate `apps/mobile/package-lock.json` on Linux before building, or EAS fails at
   "Install dependencies":
   ```powershell
   docker run --rm -v "${PWD}:/w" -w /w node:22 npm install --package-lock-only   # run inside apps/mobile
   ```

Dev mode settings live in `apps/api/.env.development` (created from `.env.api`; git-ignored). The script rewrites the database,
Redis and URL lines each run, so put vendor keys there or in `.env.api`. While dev mode runs, https://lumoraos.in has no app behind
it (502); `.\dev.ps1 -Stop` brings it back.

Dev mode makes the API reachable from your Wi-Fi network (so the phone can use it). Use it on a trusted network.

# Local https://lumoraos.in (production-like)

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
