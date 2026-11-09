/**
 * La charte de Dem, déclarée une fois. `styles.css` reprend ces valeurs en variables CSS ;
 * `palette.test.ts` vérifie que chaque paire texte sur fond atteint le contraste AA.
 */
export const COLORS = {
  /** Vert baobab : la couleur dominante. */
  baobab: '#0B5D3B',
  /** Jaune soleil : l'accent, toujours avec du texte foncé. */
  soleil: '#F2B51D',
  /** Rouge latérite : bordures et icônes d'erreur, jamais du texte (contraste trop faible). */
  laterite: '#D64933',
  /** Rouge latérite foncé : le texte d'erreur, et le fond d'un bouton à texte blanc. */
  lateriteFonce: '#B83A27',
  /** Bleu Atlantique : les lignes officielles. */
  atlantique: '#1C6E8C',
  /** Sable : le fond des pages. */
  sable: '#FBF7EF',
  /** Le texte courant. */
  texte: '#14261C',
  blanc: '#FFFFFF',
} as const;

export type ColorName = keyof typeof COLORS;

/** Les seules associations de texte et de fond utilisées dans l'interface. */
export const TEXT_PAIRS: readonly { text: ColorName; background: ColorName }[] = [
  { text: 'texte', background: 'sable' },
  { text: 'texte', background: 'blanc' },
  { text: 'texte', background: 'soleil' },
  { text: 'baobab', background: 'sable' },
  { text: 'blanc', background: 'baobab' },
  { text: 'atlantique', background: 'sable' },
  { text: 'atlantique', background: 'blanc' },
  { text: 'blanc', background: 'atlantique' },
  { text: 'lateriteFonce', background: 'sable' },
  { text: 'blanc', background: 'lateriteFonce' },
];

/** Luminance relative d'une couleur `#RRGGBB`, selon WCAG 2. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Le rapport de contraste WCAG entre deux couleurs, de 1 (aucun) à 21 (noir sur blanc). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
