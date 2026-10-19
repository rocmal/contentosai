import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Cloudflare quick tunnels (used so cloud AI providers like D-ID can
      // fetch locally-hosted avatar photos) come from a random *.trycloudflare.com
      // host each run - Vite's host-header check would 403 those otherwise.
      // XAMPP Apache serves the local copy as https://lumoraos.in (deploy/local, hosts file) and passes that
      // host through, so in dev mode (deploy/local/dev.ps1) Vite must accept it; lumoraos.local is the older alias.
      allowedHosts: ['.trycloudflare.com', '.lumoraos.in', 'lumoraos.local'],
    },
  };
});
