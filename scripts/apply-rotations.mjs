// Bakes the CMS "Rotate photo" choice into the image files.
//
//   node scripts/apply-rotations.mjs
//
// For every work whose YAML has a non-zero `rotate`, the photo is turned and
// saved under a new name (e.g. column-ii.jpg → column-ii-3fa9c1d2.jpg), and
// the entry points to it with `rotate` removed. The new name matters: Pages CMS
// shows thumbnails from a fixed GitHub URL, which browsers keep cached, so
// overwriting the same file left stale thumbnails for hours.
// Runs in the deploy workflow on every push; safe to run again.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseDocument } from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORKS = path.join(ROOT, 'src/content/works');
const SETTINGS = path.join(ROOT, 'src/content/site/settings.yaml');
const VALID = new Set([90, 180, 270]);

const renames = new Map(); // old image path (as written in YAML) → new one
let changed = 0;

for (const name of fs.readdirSync(WORKS).filter((f) => f.endsWith('.yaml')).sort()) {
  const yamlPath = path.join(WORKS, name);
  const doc = parseDocument(fs.readFileSync(yamlPath, 'utf8'));
  if (!doc.has('rotate')) continue;

  const rotate = Number(doc.get('rotate'));
  // The CMS saves "0" (its default) with every entry; leave that alone so
  // ordinary edits don't cause a follow-up commit.
  if (!VALID.has(rotate)) continue;

  const image = doc.get('image');
  const imagePath = typeof image === 'string' ? path.resolve(WORKS, image) : null;
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.warn(`${name}: image ${image} not found; leaving rotate in place`);
    continue;
  }

  const newImage = await rotateFile(image, imagePath, rotate);
  renames.set(image, newImage);
  doc.set('image', newImage);
  // Applied: reset the dropdown so the same turn isn't applied twice.
  doc.delete('rotate');
  fs.writeFileSync(yamlPath, doc.toString());
  changed++;
  console.log(`${name}: rotated by ${rotate}° → ${newImage}`);
}

// Other entries and the home page settings may use the same photos.
if (renames.size) {
  for (const file of [SETTINGS, ...fs.readdirSync(WORKS).filter((f) => f.endsWith('.yaml')).map((f) => path.join(WORKS, f))]) {
    const text = fs.readFileSync(file, 'utf8');
    let updated = text;
    for (const [from, to] of renames) updated = updated.split(from).join(to);
    if (updated !== text) fs.writeFileSync(file, updated);
  }
}

console.log(changed ? `Updated ${changed} entries.` : 'No rotations to apply.');

// Writes the rotated photo under a content-hashed name, removes the old file,
// and returns the new path in the same relative form as `image`.
async function rotateFile(image, file, degrees) {
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

  const ext = path.extname(file);
  // Drop a hash from an earlier rotation so names don't keep growing.
  const base = path.basename(file, ext).replace(/-[0-9a-f]{8}$/, '');
  const hash = createHash('sha1').update(output).digest('hex').slice(0, 8);
  const newFile = path.join(path.dirname(file), `${base}-${hash}${ext}`);

  fs.writeFileSync(newFile, output);
  if (newFile !== file) fs.rmSync(file);
  return path.posix.join(path.posix.dirname(image), path.basename(newFile));
}
