import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';

export type Rotation = 0 | 90 | 180 | 270;

// Image metadata for a photo turned by `rotate` degrees, so Astro computes
// sizes and aspect ratios for the rotated picture. Pass it together with
// `rotate` to <Image> / getImage(); image-service.ts does the turning.
export function rotated(image: ImageMetadata, rotate: Rotation): ImageMetadata {
  if (rotate !== 90 && rotate !== 270) return image;
  // Copy Astro's hidden props (e.g. fsPath) too, but drop `clone`: Astro uses
  // it for the original proportions, which a sideways turn swaps.
  const { clone: _clone, ...descriptors } = Object.getOwnPropertyDescriptors(image) as Record<
    string,
    PropertyDescriptor
  >;
  const copy = Object.defineProperties({}, descriptors) as ImageMetadata;
  return Object.assign(copy, { width: image.height, height: image.width });
}

// Home page photos point at the same files as works; reuse each work's rotation.
export async function rotationFor(image: ImageMetadata): Promise<Rotation> {
  const works = await getCollection('works');
  return works.find((w) => w.data.image.src === image.src)?.data.rotate ?? 0;
}
