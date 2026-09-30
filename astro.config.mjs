// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://snejanasimeonova.com',
  image: {
    // Adds a `rotate` option for sideways photos (see src/image-service.ts).
    service: { entrypoint: './src/image-service.ts' },
  },
  i18n: {
    locales: ['en', 'bg'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
