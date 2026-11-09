import { COLORS } from './palette';

// Les couleurs peintes des cars rapides de Dakar, dans l'ordre de la charte.
const STRIPE = [COLORS.baobab, COLORS.soleil, COLORS.atlantique, COLORS.laterite];
const TRIANGLES = 24;

/**
 * La frise de triangles sous l'en-tête, inspirée des cars rapides. Dessinée en SVG : aucune
 * image à télécharger. Décorative : cachée aux lecteurs d'écran.
 */
export function CarRapideFrieze() {
  return (
    <svg
      data-testid="car-rapide-frieze"
      aria-hidden="true"
      focusable="false"
      className="block h-3 w-full"
      viewBox={`0 0 ${TRIANGLES * 2} 2`}
      preserveAspectRatio="none"
    >
      {Array.from({ length: TRIANGLES }, (_, i) => (
        <polygon
          key={i}
          points={`${i * 2},2 ${i * 2 + 1},0 ${i * 2 + 2},2`}
          fill={STRIPE[i % STRIPE.length]}
        />
      ))}
    </svg>
  );
}
