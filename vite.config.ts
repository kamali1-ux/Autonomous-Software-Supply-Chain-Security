import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  let hmrConfig: boolean | { protocol?: string; host?: string; clientPort?: number } = false;

  if (!isHmrDisabled) {
    if (process.env.APP_URL) {
      try {
        const parsedUrl = new URL(process.env.APP_URL);
        hmrConfig = {
          protocol: parsedUrl.protocol === 'https:' ? 'wss' : 'ws',
          host: parsedUrl.hostname,
          clientPort: parsedUrl.protocol === 'https:' ? 443 : 80,
        };
      } catch {
        hmrConfig = true;
      }
    } else {
      hmrConfig = true;
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: hmrConfig,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: isHmrDisabled ? null : {},
    },
  };
});
