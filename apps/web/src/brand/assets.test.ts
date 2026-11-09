/**
 * Les images de marque restent légères pour une 4G lente : du WebP compressé, pas un PNG brut.
 * Le temps d'affichage réel se mesure dans un navigateur (Lighthouse, « 4G lente »).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BRAND_IMAGES } from './assets';

const MAX_BYTES = 50 * 1024;
// Pas `new URL(…, import.meta.url)` : Vite le réécrit en import d'image, `undefined` en test.
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

describe('brand images', () => {
  it('006-AS7: declares the JOJ logo and the Ayo mascot', () => {
    expect(Object.keys(BRAND_IMAGES).sort()).toEqual(['logo', 'mascotte']);
  });

  it.each(Object.entries(BRAND_IMAGES))(
    '006-AS7: brand images are compressed WebP (%s)',
    (_name, publicPath) => {
      const bytes = readFileSync(join(PUBLIC_DIR, publicPath));
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
      expect(bytes.length).toBeLessThan(MAX_BYTES);
    },
  );
});
