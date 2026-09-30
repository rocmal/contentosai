import { config as loadEnv } from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// dotenv is a declared dependency but nothing was actually loading .env.local
// locally (AI Studio's cloud runtime injects secrets as real env vars, but a
// local `npm run dev` has no such injection). Same precedence as Vite's own
// client-side env loading: .env.local wins, .env is the fallback.
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
loadEnv({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// --- API Routes ---

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Lumora Content OS Backend', timestamp: new Date().toISOString() });
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Lumora Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
