/**
 * Dem n'a qu'une charte, claire. Les composants shadcn portent des classes `dark:` : si elles
 * suivaient le mode sombre du téléphone, le bouton « Réessayer » tomberait à 2,74:1, sous AA.
 * jsdom n'applique pas les réglages du téléphone : la règle se vérifie dans `styles.css`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'styles.css'),
  'utf8',
);

describe('dark mode', () => {
  it('006-AS6: keeps the charter colours when the phone is in dark mode', () => {
    // La variante `dark:` ne s'active qu'avec une classe `.dark`, que Dem ne pose jamais.
    expect(styles).toContain('@custom-variant dark (&:is(.dark *));');
    expect(styles).not.toMatch(/prefers-color-scheme:\s*dark/);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
