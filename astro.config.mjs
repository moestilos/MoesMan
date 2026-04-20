import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
    maxDuration: 30,
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
  ],
  server: { host: true, port: 4321 },
  // Auth = JWT Bearer header, no cookies usados en API. Desactivar checkOrigin
  // evita "Cross-site POST form submissions are forbidden" en endpoints sin body
  // (toggle favorite, clear progress, delete chapter progress, etc.).
  security: { checkOrigin: false },
  vite: {
    ssr: { noExternal: [] },
  },
});
