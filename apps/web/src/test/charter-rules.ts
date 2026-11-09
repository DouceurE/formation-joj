/**
 * Deux règles de la charte, vérifiables dans jsdom même sans CSS ni mise en page :
 * - une animation n'existe que sous `motion-safe:`, coupée si le téléphone demande moins
 *   d'animations ;
 * - tout ce qu'on touche porte `min-h-11` (ou `size-11`), soit 44 px.
 */
const ANIMATION_CLASS = /(^|:)(animate-|fade-in|fade-out|slide-in|slide-out|zoom-in|spin-in)/;
const TAP_TARGET = /(^|\s)(min-h-11|size-11)(\s|$)/;
const TOUCHABLE = 'a[href], button, select, input, textarea, [role="button"]';

/** Les classes d'animation qui s'appliqueraient même sur un téléphone qui en demande moins. */
export function unguardedAnimations(root: ParentNode = document.body): string[] {
  return [...root.querySelectorAll('[class]')].flatMap((element) =>
    String(element.getAttribute('class'))
      .split(/\s+/)
      .filter((token) => ANIMATION_CLASS.test(token) && !token.startsWith('motion-safe:')),
  );
}

/** Les éléments touchables qui n'annoncent pas une cible de 44 px, décrits pour le message. */
export function smallTapTargets(root: ParentNode = document.body): string[] {
  return [...root.querySelectorAll(TOUCHABLE)]
    .filter((element) => !TAP_TARGET.test(element.getAttribute('class') ?? ''))
    .map((element) => `${element.tagName.toLowerCase()} « ${element.textContent?.trim()} »`);
}
