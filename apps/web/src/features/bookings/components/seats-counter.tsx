/**
 * Le compteur des places restantes, en grand. `key` relance l'animation quand le nombre change
 * (après une réservation) ; sous `motion-safe:` seulement.
 */
export function SeatsCounter({ remaining }: { remaining: number }) {
  return (
    <div
      role="status"
      aria-label="Places restantes"
      className="flex items-baseline gap-2 rounded-lg bg-soleil px-4 py-3 text-texte"
    >
      <span
        key={remaining}
        className="font-display text-5xl font-extrabold motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-500"
      >
        {remaining}
      </span>{' '}
      <span className="font-semibold">
        {remaining <= 1 ? 'place restante' : 'places restantes'}
      </span>
    </div>
  );
}
