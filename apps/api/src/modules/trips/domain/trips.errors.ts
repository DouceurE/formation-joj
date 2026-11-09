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
  /** Lieu de départ ou téléphone vide, ou trop long. */
  TRIP_FIELD_REQUIRED: 'VALIDATION',
} as const satisfies Record<string, ErrorKind>;

export type TripErrorCode = keyof typeof TRIP_ERROR_KINDS;

export class TripError extends AppError<TripErrorCode> {
  constructor(code: TripErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, TRIP_ERROR_KINDS[code], message, details);
  }
}
