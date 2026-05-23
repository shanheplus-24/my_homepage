import mdx from '@astrojs/mdx';
import editableRegions from '@cloudcannon/editable-regions/astro-integration';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const base = process.env.BASE_PATH || undefined;
const enableEditableRegions = process.env.CLOUDCANNON === '1' || process.env.CLOUDCANNON === 'true';

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  base,
  devToolbar: {
    enabled: false,
  },
  integrations: [mdx(), ...(enableEditableRegions ? [editableRegions()] : [])],
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss()],
  },
});
