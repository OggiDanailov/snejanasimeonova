import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Text shown to visitors is stored in both languages side by side.
const bilingual = z.object({ en: z.string(), bg: z.string() });

export const CATEGORIES = ['media', 'small', 'monumental'] as const;

const works = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: bilingual,
      category: z.enum(CATEGORIES),
      image: image(),
      material: bilingual.optional(),
      dimensions: z.string().optional(),
      year: z.number().int().optional(),
      location: bilingual.optional(),
      // Position within its category; lower numbers come first.
      order: z.number().default(1000),
    }),
});

export const collections = { works };
