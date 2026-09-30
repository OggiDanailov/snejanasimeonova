export const LOCALES = ['en', 'bg'] as const;
export type Locale = (typeof LOCALES)[number];

export const UI = {
  en: {
    siteTitle: 'Snejana Simeonova',
    media: 'Media',
    small: 'Small sculptures',
    monumental: 'Monumental',
  },
  bg: {
    siteTitle: 'Снежана Симеонова',
    media: 'Медия',
    small: 'Малка пластика',
    monumental: 'Монументална пластика',
  },
} satisfies Record<Locale, Record<string, string>>;
