import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Text shown to visitors is stored in both languages side by side.
const bilingual = z.object({ en: z.string(), bg: z.string() });

export const CATEGORIES = ['monumental', 'small', 'media'] as const;
export type Category = (typeof CATEGORIES)[number];

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

// One Markdown file per language: bio/en.md, bio/bg.md
const bio = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/bio' }),
  schema: z.object({ title: z.string() }),
});

// Site-wide texts, contact details and the photos used on the home page.
const site = defineCollection({
  loader: glob({ pattern: 'settings.yaml', base: './src/content/site' }),
  schema: ({ image }) =>
    z.object({
      tagline: bilingual,
      intro: bilingual,
      heroImage: image(),
      covers: z.object({ monumental: image(), small: image(), media: image() }),
      email: z.string(),
      phone: z.string().optional(),
      facebook: z.string().optional(),
      location: bilingual,
    }),
});

export const collections = { works, bio, site };
