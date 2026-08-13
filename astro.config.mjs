import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const siteUrl = process.env.SITE_URL || 'https://oktanon.github.io/svencoop-maps';

export default defineConfig({
  site: siteUrl,
  integrations: [react(), sitemap()],
});
