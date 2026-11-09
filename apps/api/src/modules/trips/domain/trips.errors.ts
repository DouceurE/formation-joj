import { AppError, type ErrorKind } from '../../../core/errors/app-error';

/**
 * Codes stables exposés aux clients ; la catégorie décide du statut HTTP.
 * SEATS_OUT_OF_RANGE et DEPARTURE_IN_PAST sont fixés par la spec 001, sans préfixe.
 */
const TRIP_ERROR_KINDS = {
  /** Les places ne sont pas entre 1 et le maximum du véhicule. */
  SEATS_OUT_OF_RANGE: 'VALIDATION',
  /** Le départ est antérieur à l'instant de la publication. */
  DEPARTURE_IN_PAST: 'BUSINESS_RULE',
  /** Véhicule absent de TRIP_VEHICLES. */
  TRIP_VEHICLE_UNKNOWN: 'VALIDATION',
  /** Site absent de TRIP_SITES. */
  TRIP_SITE_UNKNOWN: 'VALIDATION',
  /** Prix négatif ou non entier. */
  TRIP_PRICE_INVALID: 'VALIDATION',
  /** Lieu de départ, nom ou téléphone vide, ou trop long. */
  TRIP_FIELD_REQUIRED: 'VALIDATION',
  /** Toutes les places sont réservées. */
  TRIP_FULL: 'CONFLICT',
  /** Ce téléphone a déjà une réservation sur ce trajet. */
  TRIP_ALREADY_BOOKED: 'CONFLICT',
  /** Le départ est antérieur à l'instant de la réservation. */
  TRIP_ALREADY_DEPARTED: 'BUSINESS_RULE',
  /** Aucun trajet n'a cet identifiant. */
  TRIP_NOT_FOUND: 'NOT_FOUND',
} as const satisfies Record<string, ErrorKind>;

export type TripErrorCode = keyof typeof TRIP_ERROR_KINDS;

export class TripError extends AppError<TripErrorCode> {
  constructor(code: TripErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, TRIP_ERROR_KINDS[code], message, details);
  }
}

export function tripFull(id: string, seats: number): TripError {
  return new TripError('TRIP_FULL', `Trip ${id} is full (${seats} seats)`, { id, seats });
}

export function tripAlreadyBooked(id: string): TripError {
  return new TripError('TRIP_ALREADY_BOOKED', `This phone already has a booking on trip ${id}`, {
    id,
  });
}

export function tripNotFound(id: string): TripError {
  return new TripError('TRIP_NOT_FOUND', `No trip with id ${id}`, { id });
}

/** Un champ texte obligatoire : sans espaces autour, non vide, pas trop long. */
export function requiredText(field: string, value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new TripError(
      'TRIP_FIELD_REQUIRED',
      `${field} is required, with at most ${maxLength} characters`,
      { field },
    );
  }
  return trimmed;
}
