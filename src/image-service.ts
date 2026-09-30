// Astro's sharp image service plus a `rotate` option (0/90/180/270), so
// editors can fix sideways photos from the CMS without touching the files.
import type { LocalImageService } from 'astro';
import sharpService from 'astro/assets/services/sharp';
import sharp from 'sharp';

const base = sharpService as LocalImageService;

// Astro's DEFAULT_HASH_PROPS (not exported); the sharp service doesn't set its own.
const DEFAULT_HASH_PROPS = ['src', 'width', 'height', 'format', 'quality', 'fit', 'position', 'background'];

const service: LocalImageService = {
  ...base,
  // Different rotations of the same photo must produce different files.
  propertiesToHash: [...(base.propertiesToHash ?? DEFAULT_HASH_PROPS), 'rotate'],

  // Dev server: carry the rotation through the image endpoint's URL.
  getURL(options, imageConfig) {
    const url = base.getURL(options, imageConfig) as string;
    return options.rotate ? `${url}${url.includes('?') ? '&' : '?'}rot=${options.rotate}` : url;
  },

  parseURL(url, imageConfig) {
    const transform = base.parseURL(url, imageConfig);
    const rotate = Number(url.searchParams.get('rot'));
    return transform && rotate ? { ...transform, rotate } : transform;
  },

  // Keep `rotate` out of the rendered <img> attributes.
  getHTMLAttributes(options, imageConfig) {
    const { rotate: _rotate, ...rest } = options;
    return base.getHTMLAttributes!(rest, imageConfig);
  },

  async transform(inputBuffer, transform, imageConfig, logger) {
    const input = transform.rotate
      ? await sharp(inputBuffer).rotate(Number(transform.rotate)).toBuffer()
      : inputBuffer;
    return base.transform(input, transform, imageConfig, logger);
  },
};

export default service;
