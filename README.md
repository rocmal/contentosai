<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/02f05dc5-7915-4168-a492-73e4293fe2fb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Running with the Lumora backend (apps/api)

The frontend now talks to a real NestJS backend for Image/Voice/Video Studio generation and
login (see `src/lib/api.ts`, `src/contexts/AuthContext.tsx`). Both dev servers default to port
**3000**, so the backend's port is moved to **3001** to avoid a collision:

```bash
# terminal 1 - backend (apps/api/.env.development has APP_PORT=3001)
cd apps/api
npm run db:migrate
npm run db:seed
npm run start:dev

# terminal 2 - frontend (reads VITE_API_URL from .env.local)
npm run dev
```

`.env.local` at the repo root sets `VITE_API_URL=http://localhost:3001` so the frontend finds the
backend. Log in at http://localhost:3000 with `admin@lumora.ai` / `Admin@12345` (seeded - see
`apps/api/src/database/seeders`). Image/Voice/Video Studio generation will return a clean 503
until real provider API keys are added to `apps/api/.env.development`.
