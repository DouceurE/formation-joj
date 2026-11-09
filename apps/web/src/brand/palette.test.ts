/**
 * Le contraste AA de la charte, prouvé par le calcul : jsdom n'applique pas de CSS, l'audit axe
 * ne peut pas le mesurer. Chaque couleur de texte n'est utilisée que sur les fonds listés ici.
 */
import { describe, expect, it } from 'vitest';
import { COLORS, contrastRatio, TEXT_PAIRS } from './palette';

describe('charter palette', () => {
  it('006-AS6: lists the text colours of the charter with their backgrounds', () => {
    expect(TEXT_PAIRS.length).toBeGreaterThan(0);
  });

  it.each(TEXT_PAIRS)(
    '006-AS6: every text colour of the charter reaches AA ($text on $background)',
    ({ text, background }) => {
      expect(contrastRatio(COLORS[text], COLORS[background])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('006-AS6: never uses the light laterite red as a text colour, which fails AA on sand', () => {
    expect(contrastRatio(COLORS.laterite, COLORS.sable)).toBeLessThan(4.5);
    expect(TEXT_PAIRS.some((pair) => pair.text === 'laterite')).toBe(false);
  });

  it('006-AS6: computes the WCAG ratio of black on white as 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
});
