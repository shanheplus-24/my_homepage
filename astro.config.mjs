import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import './scripts/admin/prepare.mjs';

const base = process.env.BASE_PATH || undefined;

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  base,
  devToolbar: {
    enabled: false,
  },
  integrations: [mdx()],
  vite: {
    server: { proxy: { '/api/admin': 'http://127.0.0.1:8082' } },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss()],
  },
});
