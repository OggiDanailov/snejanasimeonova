// One-off migration: turns the legacy image folders into content entries.
//
//   node scripts/migrate-images.mjs --dry-run   print what would be created
//   node scripts/migrate-images.mjs             write images + YAML entries
//
// Each legacy image becomes:
//   src/assets/works/<slug>.jpg          (EXIF-rotated, max 2400px, JPEG)
//   src/content/works/<slug>.yaml         (bilingual metadata parsed from the filename)
//
// Titles that can't be parsed or translated automatically are listed in
// scripts/migration-report.md for a human to review.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { TITLES, TITLE_OVERRIDES } from './migration-titles.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const LEGACY = path.join(ROOT, 'legacy/images');
const OUT_DIR = path.join(ROOT, 'src/content/works');
const OUT_IMAGES = path.join(ROOT, 'src/assets/works');
const MAX_SIZE = 2400;
const DRY_RUN = process.argv.includes('--dry-run');

const SOURCES = [
  { category: 'media', dir: 'media' },
  { category: 'small', dir: 'small/small sculptures' },
  { category: 'monumental', dir: 'monumental' },
];

// Longest phrases first so "black marble" wins over "marble".
const MATERIALS = [
  ['white and black marble iron sticks', 'white and black marble, iron sticks', 'бял и черен мрамор, железни пръти'],
  ['black marble painted iron sticks', 'black marble, painted iron sticks', 'черен мрамор, боядисани железни пръти'],
  ['black marble iron sticks', 'black marble, iron sticks', 'черен мрамор, железни пръти'],
  ['marble painted bronze', 'marble, painted bronze', 'мрамор, оцветен бронз'],
  ['black marble bronze', 'black marble, bronze', 'черен мрамор, бронз'],
  ['marble,? bronze', 'marble, bronze', 'мрамор, бронз'],
  ['bronze stone', 'bronze, stone', 'бронз, камък'],
  ['blue limestone', 'blue limestone', 'син варовик'],
  ['limestone', 'limestone', 'варовик'],
  ['sandstone', 'sandstone', 'пясъчник'],
  ['travertine', 'travertine', 'травертин'],
  ['andesite', 'andesite', 'андезит'],
  ['granite?', 'granite', 'гранит'],
  ['marble', 'marble', 'мрамор'],
  ['bronze', 'bronze', 'бронз'],
  ['bricks', 'bricks', 'тухли'],
  ['wood', 'wood', 'дърво'],
  ['бронз черен мрамор', 'bronze, black marble', 'бронз, черен мрамор'],
  ['бронз гранит', 'bronze, granite', 'бронз, гранит'],
  ['мрамор', 'marble', 'мрамор'],
  ['бронз', 'bronze', 'бронз'],
];

const PLACES = [
  ['new zealand', 'New Zealand', 'Нова Зеландия'],
  ['hoyerswerda', 'Hoyerswerda, Germany', 'Хойерсверда, Германия'],
  ['ilindenzi', 'Ilindentsi, Bulgaria', 'Илинденци, България'],
  ['australia', 'Australia', 'Австралия'],
  ['bulgaria', 'Bulgaria', 'България'],
  ['belgium', 'Belgium', 'Белгия'],
  ['белгия', 'Belgium', 'Белгия'],
  ['germany', 'Germany', 'Германия'],
  ['romania', 'Romania', 'Румъния'],
  ['holland', 'Netherlands', 'Нидерландия'],
  ['israel', 'Israel', 'Израел'],
  ['turkey', 'Turkey', 'Турция'],
  ['france', 'France', 'Франция'],
  ['spain', 'Spain', 'Испания'],
  ['china', 'China', 'Китай'],
  ['japan', 'Japan', 'Япония'],
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[а-я]/g, (c) => CYR[c] ?? '')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseFilename(file) {
  let rest = path.parse(file).name.normalize('NFC').replace(/\s+/g, ' ').trim();
  // Latin words typed with a stray Cyrillic letter, e.g. "piecе"
  rest = rest.replace(/(?<=[a-z])е|е(?=[a-z])/gi, 'e');
  const info = { file, dimensions: null, year: null, material: null, place: null };

  // Dimensions: "250x70x70 cm", "280z70z60cm", "60х20х20см" (Cyrillic х), "250 220 60cm"
  const dimRe = /(\d{2,3})\s*[xхz]\s*(\d{2,3})(?:\s*[xхz]\s*(\d{2,3}))?\s*(?:cm|см)?|(\d{2,3}) (\d{2,3}) (\d{2,3})\s*cm/i;
  const dim = rest.match(dimRe);
  if (dim) {
    const parts = (dim[1] ? [dim[1], dim[2], dim[3]] : [dim[4], dim[5], dim[6]]).filter(Boolean);
    info.dimensions = `${parts.join(' × ')} cm`;
    rest = rest.replace(dim[0], ' ');
  }

  const year = rest.match(/(?<!\d)(19[89]\d|20[0-2]\d)(?!\d)/);
  if (year) {
    info.year = Number(year[1]);
    rest = rest.replace(year[0], ' ');
  }

  for (const [key, en, bg] of PLACES) {
    const re = new RegExp(`(^|[\\s,])${key}(?=$|[\\s,.])`, 'i');
    if (re.test(rest)) {
      info.place = { en, bg };
      rest = rest.replace(re, ' ');
      break;
    }
  }

  for (const [key, en, bg] of MATERIALS) {
    const re = new RegExp(`(^|[\\s,])${key}(?=$|[\\s,.])`, 'i');
    if (re.test(rest)) {
      info.material = { en, bg };
      rest = rest.replace(re, ' ');
      break;
    }
  }

  // Remaining text is the title, minus photo-numbering noise:
  // leading "4." / "7. ", trailing camera counters "001", trailing variant letters "a", "n", "ai".
  info.rawTitle = rest
    .replace(/^\d+\.\s*/, '')
    .replace(/\(\d+\)/g, ' ')
    .replace(/[;,]/g, ' ')
    .replace(/\s+-\s*$|\s-\s/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\s\d{3})+$/, '')
    .replace(/\s(?:[a-z]|ai)$/, '') // lowercase only, so numerals like "I" survive
    .replace(/\b([IVX]+)a$/, '$1')
    .replace(/\.[a-z]$/, '')
    .replace(/[-.\s]+$/, '')
    .trim();
  return info;
}

// Splits "Tower of fear III" into base "Tower of fear" + numeral "III".
function splitNumeral(title) {
  const m = title.match(/^(.*?)[\s-]*\b([IVX]+|\d{1,2})$/);
  if (m && m[1] && (ROMAN.includes(m[2]) || /^\d+$/.test(m[2]))) {
    return { base: m[1].trim(), numeral: /^\d+$/.test(m[2]) ? ROMAN[Number(m[2]) - 1] ?? m[2] : m[2] };
  }
  return { base: title, numeral: null };
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function buildTitle(info) {
  const override = TITLE_OVERRIDES[info.file];
  if (override) return { en: override.en, bg: override.bg, reviewed: !override.review };

  const { base, numeral } = splitNumeral(info.rawTitle);
  const suffix = numeral ? ` ${numeral}` : '';
  const known = TITLES[base.toLowerCase()];
  if (known) return { en: known.en + suffix, bg: known.bg + suffix, reviewed: true };

  const isCyrillic = /[а-я]/i.test(base);
  const title = capitalize(base.toLowerCase()) + suffix;
  return { en: isCyrillic ? null : title, bg: isCyrillic ? title : null, reviewed: false };
}

function seriesKey(title) {
  return splitNumeral(title.en ?? title.bg).base.toLowerCase();
}

function romanIndex(title) {
  const { numeral } = splitNumeral(title.en ?? title.bg ?? '');
  return numeral ? ROMAN.indexOf(numeral) + 1 : 0;
}

function yamlString(value) {
  return JSON.stringify(value); // JSON strings are valid YAML scalars
}

function toYaml(entry) {
  const lines = [
    `title:`,
    `  en: ${yamlString(entry.title.en ?? '')}`,
    `  bg: ${yamlString(entry.title.bg ?? '')}`,
    `category: ${entry.category}`,
  ];
  if (entry.material) lines.push(`material:`, `  en: ${yamlString(entry.material.en)}`, `  bg: ${yamlString(entry.material.bg)}`);
  if (entry.dimensions) lines.push(`dimensions: ${yamlString(entry.dimensions)}`);
  if (entry.year) lines.push(`year: ${entry.year}`);
  if (entry.place) lines.push(`location:`, `  en: ${yamlString(entry.place.en)}`, `  bg: ${yamlString(entry.place.bg)}`);
  lines.push(`image: ../../assets/works/${entry.slug}.jpg`, `order: ${entry.order}`);
  return lines.join('\n') + '\n';
}

async function convertImage(src, dest) {
  let input = src;
  let tmp = null;
  // sharp can't read BMP; let macOS sips turn it into PNG first.
  // Check the header, not the extension: some legacy ".jpg" files are really BMPs.
  const header = Buffer.alloc(2);
  const fd = fs.openSync(src, 'r');
  fs.readSync(fd, header, 0, 2, 0);
  fs.closeSync(fd);
  if (header.toString('latin1') === 'BM') {
    tmp = path.join(os.tmpdir(), `migrate-${process.pid}-${path.basename(src)}.png`);
    execFileSync('sips', ['-s', 'format', 'png', src, '--out', tmp], { stdio: 'ignore' });
    input = tmp;
  }
  try {
    await sharp(input, { limitInputPixels: false, page: 0 })
      .rotate()
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(dest);
  } finally {
    if (tmp) fs.rmSync(tmp, { force: true });
  }
}

function fileHash(file) {
  return createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}

async function main() {
  const entries = [];
  const duplicates = [];
  const seenHashes = new Map();

  for (const { category, dir } of SOURCES) {
    const files = fs
      .readdirSync(path.join(LEGACY, dir))
      .filter((f) => /\.(jpe?g|tiff?|bmp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    for (const file of files) {
      const src = path.join(LEGACY, dir, file);
      const hash = fileHash(src);
      const info = parseFilename(file);
      const kept = seenHashes.get(hash);
      if (kept) {
        // Same photo under another name: keep the first, but borrow any details it lacks.
        for (const field of ['dimensions', 'year', 'material', 'place']) kept[field] ??= info[field];
        duplicates.push([`${dir}/${file}`, `${dir}/${kept.file}`]);
        continue;
      }
      const entry = { ...info, category, src, title: buildTitle(info) };
      seenHashes.set(hash, entry);
      entries.push(entry);
    }
  }

  // Order: group works of a series together, numerals ascending, then by year.
  for (const { category } of SOURCES) {
    const inCategory = entries.filter((e) => e.category === category);
    inCategory.sort(
      (a, b) =>
        seriesKey(a.title).localeCompare(seriesKey(b.title), 'en') ||
        romanIndex(a.title) - romanIndex(b.title) ||
        (a.year ?? 0) - (b.year ?? 0) ||
        a.file.localeCompare(b.file),
    );
    inCategory.forEach((e, i) => (e.order = (i + 1) * 10));
  }

  const usedSlugs = new Set();
  for (const e of entries) {
    const base = slugify([e.title.en ?? e.title.bg, e.year].filter(Boolean).join(' ')) || 'work';
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
    usedSlugs.add(slug);
    e.slug = slug;
  }

  if (DRY_RUN) {
    for (const e of entries) {
      const flag = e.title.reviewed ? ' ' : '?';
      console.log(
        [flag, e.category.padEnd(10), (e.title.en ?? '—').padEnd(32), (e.title.bg ?? '—').padEnd(28),
          (e.material?.en ?? '').padEnd(22), (e.dimensions ?? '').padEnd(18), e.year ?? '', e.place?.en ?? '',
          ` ← ${e.file}`].join(' | '),
      );
    }
    console.log(`\n${entries.length} works, ${entries.filter((e) => !e.title.reviewed).length} need review, ${duplicates.length} duplicates skipped`);
    for (const [dup, orig] of duplicates) console.log(`  duplicate: ${dup} = ${orig}`);
    return;
  }

  fs.mkdirSync(OUT_IMAGES, { recursive: true });
  let done = 0;
  for (const e of entries) {
    await convertImage(e.src, path.join(OUT_IMAGES, `${e.slug}.jpg`));
    fs.writeFileSync(path.join(OUT_DIR, `${e.slug}.yaml`), toYaml(e));
    process.stdout.write(`\r${++done}/${entries.length}`);
  }
  console.log();

  const review = entries.filter((e) => !e.title.reviewed);
  const report = [
    '# Image migration report',
    '',
    `${entries.length} works migrated from \`legacy/images\`.`,
    '',
    '## Titles to review',
    '',
    'These titles came from unclear filenames or had no translation. Fix them in the CMS or in `src/content/works/<slug>.yaml`.',
    '',
    '| Entry | EN | BG | Original file |',
    '|---|---|---|---|',
    ...review.map((e) => `| ${e.slug} | ${e.title.en ?? '—'} | ${e.title.bg ?? '—'} | ${e.file} |`),
    '',
    '## Duplicates skipped',
    '',
    ...(duplicates.length ? duplicates.map(([d, o]) => `- \`${d}\` is identical to \`${o}\``) : ['None.']),
    '',
  ];
  fs.writeFileSync(path.join(ROOT, 'scripts/migration-report.md'), report.join('\n'));
  console.log(`Wrote ${entries.length} entries; ${review.length} titles to review (see scripts/migration-report.md)`);
}

await main();
