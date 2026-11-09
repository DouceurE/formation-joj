import { ApiError } from '@/lib/api';

/** Un code de réservation inconnu, ou mal tapé : pour le supporter, c'est la même chose. */
export const UNKNOWN_CODE_MESSAGE = 'Aucune réservation avec ce code.';

/** Les refus de l'API dits avec des mots de tous les jours, jamais avec leur code. */
const MESSAGES: Record<string, string> = {
  TRIP_FULL: 'Ce trajet est complet.',
  TRIP_ALREADY_BOOKED: 'Ce téléphone a déjà réservé ce trajet.',
  TRIP_ALREADY_DEPARTED: 'Ce trajet est déjà parti.',
  TRIP_CANCELLED: 'Ce trajet a été annulé par son conducteur.',
  TRIP_NOT_FOUND: 'Ce trajet est introuvable.',
  VALIDATION_FAILED: 'Vérifie ton nom et ton téléphone.',
  BOOKING_NOT_FOUND: UNKNOWN_CODE_MESSAGE,
  BOOKING_ALREADY_CANCELLED: 'Cette réservation est déjà annulée.',
};

const FALLBACK = 'Quelque chose n’a pas marché. Réessaie dans un instant.';

/** La phrase à montrer pour une erreur, connue ou non. */
export function bookingErrorMessage(error: unknown): string {
  return (error instanceof ApiError && MESSAGES[error.code]) || FALLBACK;
}
