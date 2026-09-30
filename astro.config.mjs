// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://snejanasimeonova.com',
  i18n: {
    locales: ['en', 'bg'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
