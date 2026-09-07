// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://photo.emre.xyz',
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    optimizeDeps: {
      include: [
        'zod',
        'nostr-tools',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
      ],
    },
    ssr: {
      noExternal: ['zod'],
    },
  },
});
