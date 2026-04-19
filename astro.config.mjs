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
  vite: {
    ssr: { noExternal: [] },
  },
});
