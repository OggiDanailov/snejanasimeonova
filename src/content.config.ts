import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Text shown to visitors is stored in both languages side by side. Editors may
// fill in only one language; the other then falls back to it rather than
// failing the build.
const bilingual = z
  .object({ en: z.string().optional(), bg: z.string().optional() })
  .refine((v) => v.en || v.bg, { message: 'Fill in at least one language' })
  .transform((v) => ({ en: (v.en || v.bg)!, bg: (v.bg || v.en)! }));

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
      // Degrees clockwise to turn a sideways photo. The CMS may save it as text.
      rotate: z
        .union([z.number(), z.string()])
        .optional()
        .transform((v) => Number(v ?? 0))
        .pipe(z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])),
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
