import { getCollection, getEntry } from 'astro:content';
import type { Category } from './content.config';

export const LOCALES = ['en', 'bg'] as const;
export type Locale = (typeof LOCALES)[number];

export const UI = {
  en: {
    siteTitle: 'Snejana Simeonova',
    home: 'Home',
    monumental: 'Monumental',
    small: 'Small sculpture',
    media: 'Mixed media',
    biography: 'Biography',
    contact: 'Contact',
    menu: 'Menu',
    close: 'Close',
    previous: 'Previous',
    next: 'Next',
    viewWorks: 'View works',
    works: 'Works',
    workCount: (n: number) => `${n} works`,
    email: 'Email',
    phone: 'Phone',
    facebook: 'Facebook',
    location: 'Based in',
    contactIntro: 'For enquiries about works, commissions or exhibitions, please get in touch.',
    notFound: 'Page not found',
    notFoundText: 'The page you are looking for does not exist.',
    backHome: 'Back to the home page',
    otherLanguage: 'Български',
  },
  bg: {
    siteTitle: 'Снежана Симеонова',
    home: 'Начало',
    monumental: 'Монументална пластика',
    small: 'Малка пластика',
    media: 'Смесена техника',
    biography: 'Биография',
    contact: 'Контакти',
    menu: 'Меню',
    close: 'Затвори',
    previous: 'Предишна',
    next: 'Следваща',
    viewWorks: 'Разгледайте творбите',
    works: 'Творби',
    workCount: (n: number) => `${n} творби`,
    email: 'Имейл',
    phone: 'Телефон',
    facebook: 'Facebook',
    location: 'Живее и работи в',
    contactIntro: 'За въпроси относно творби, поръчки или изложби, моля, свържете се.',
    notFound: 'Страницата не е намерена',
    notFoundText: 'Страницата, която търсите, не съществува.',
    backHome: 'Към началната страница',
    otherLanguage: 'English',
  },
};

export function localeParams() {
  return LOCALES.map((lang) => ({ params: { lang } }));
}

export async function getSettings() {
  const entry = await getEntry('site', 'settings');
  if (!entry) throw new Error('Missing src/content/site/settings.yaml');
  return entry.data;
}

export async function getWorks(category: Category) {
  const works = await getCollection('works', (w) => w.data.category === category);
  return works.sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
