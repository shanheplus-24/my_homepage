import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const base = process.env.BASE_PATH || undefined;

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  base,
  devToolbar: {
    enabled: false,
  },
  integrations: [mdx()],
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss()],
  },
});
