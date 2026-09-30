// Bakes the CMS "Rotate photo" choice into the image files.
//
//   node scripts/apply-rotations.mjs
//
// For every work whose YAML has a non-zero `rotate`, the photo file itself is
// turned (so the Pages CMS thumbnail matches the site) and `rotate` is removed
// from the entry. Runs in the deploy workflow on every push; safe to run again.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseDocument } from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORKS = path.join(ROOT, 'src/content/works');
const VALID = new Set([90, 180, 270]);

const rotatedFiles = new Set();
let changed = 0;

for (const name of fs.readdirSync(WORKS).filter((f) => f.endsWith('.yaml')).sort()) {
  const yamlPath = path.join(WORKS, name);
  const doc = parseDocument(fs.readFileSync(yamlPath, 'utf8'));
  if (!doc.has('rotate')) continue;

  const rotate = Number(doc.get('rotate'));
  const image = doc.get('image');
  // The CMS saves "0" (its default) with every entry; leave that alone so
  // ordinary edits don't cause a follow-up commit.
  if (!VALID.has(rotate)) continue;

  if (typeof image === 'string') {
    const imagePath = path.resolve(WORKS, image);
    if (rotatedFiles.has(imagePath)) {
      console.warn(`${name}: ${image} was already rotated for another entry; skipping`);
    } else if (!fs.existsSync(imagePath)) {
      console.warn(`${name}: image ${image} not found; leaving rotate in place`);
      continue;
    } else {
      await rotateFile(imagePath, rotate);
      rotatedFiles.add(imagePath);
      console.log(`${name}: rotated ${path.relative(ROOT, imagePath)} by ${rotate}°`);
    }
  }

  // Applied: reset the dropdown so the same turn isn't applied twice.
  doc.delete('rotate');
  fs.writeFileSync(yamlPath, doc.toString());
  changed++;
}

console.log(changed ? `Updated ${changed} entries.` : 'No rotations to apply.');

async function rotateFile(file, degrees) {
  const input = fs.readFileSync(file);
  // autoOrient first: phone photos may carry an EXIF orientation tag, and the
  // rotation should apply to the picture as people actually see it.
  const pipeline = sharp(input).autoOrient().rotate(degrees);
  const { format } = await sharp(input).metadata();
  const output =
    format === 'png'
      ? await pipeline.png().toBuffer()
      : format === 'webp'
        ? await pipeline.webp({ quality: 92 }).toBuffer()
        : await pipeline.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  fs.writeFileSync(file, output);
}
