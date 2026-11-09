/** La clé du navigateur où Dem garde les codes de réservation, et rien d'autre. */
const KEY = 'dem.bookings';

/** Lit la liste ; une mémoire absente, illisible ou bloquée donne une liste vide. */
function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((code): code is string => typeof code === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Écrit la liste ; une mémoire pleine ou bloquée (navigation privée) n'empêche pas de réserver. */
function write(codes: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    // Le billet reste affiché : le supporter peut toujours copier ou s'envoyer son code.
  }
}

/**
 * Les codes de réservation gardés dans le téléphone, pour « Mes trajets ». Ni nom ni numéro :
 * seulement les codes, le dernier gardé en dernier.
 */
export const savedBookings = {
  list(): string[] {
    return read();
  },

  save(code: string): void {
    write([...read().filter((saved) => saved !== code), code]);
  },

  /** Retire le code du téléphone, sans rien changer à la réservation dans l'API. */
  forget(code: string): void {
    write(read().filter((saved) => saved !== code));
  },
};
