import {
  TRIP_DEPARTURE_PLACE_MAX_LENGTH,
  TRIP_SITES,
  TRIP_VEHICLES,
  type TripSite,
  type TripVehicle,
} from '@joj/shared';
import { TripError } from './trips.errors';

/** Ce que l'assistant a lu dans le message : chaque champ peut manquer ou être faux. */
export interface ExtractedTrip {
  vehicle: string | null;
  departurePlace: string | null;
  site: string | null;
  /** Instant ISO 8601, calculé par l'assistant depuis « demain 8h » et la date du jour. */
  departureAt: string | null;
  seats: number | null;
  priceFcfa: number | null;
}

/** Le trajet proposé au conducteur : site et départ trouvés, le reste à compléter s'il manque. */
export interface TripProposal {
  vehicle: TripVehicle | null;
  departurePlace: string | null;
  site: TripSite;
  departureAt: Date;
  seats: number | null;
  priceFcfa: number | null;
}

/**
 * Ne garde que ce qui a un sens. Les règles de TR1 (places selon le véhicule, départ à venir)
 * ne sont pas vérifiées ici : la publication les appliquera après relecture.
 */
export function proposeTrip(extracted: ExtractedTrip): TripProposal {
  return {
    vehicle: knownVehicle(extracted.vehicle),
    departurePlace: place(extracted.departurePlace),
    site: requiredSite(extracted.site),
    departureAt: requiredDeparture(extracted.departureAt),
    seats: positiveInteger(extracted.seats),
    priceFcfa: wholePrice(extracted.priceFcfa),
  };
}

function requiredSite(site: string | null): TripSite {
  if (site === null || !(TRIP_SITES as readonly string[]).includes(site)) {
    throw new TripError(
      'PROPOSAL_SITE_NOT_FOUND',
      'No site among Dakar, Diamniadio and Saly was found in the message',
      { allowed: TRIP_SITES },
    );
  }
  return site as TripSite;
}

/**
 * Un instant ISO 8601 avec son heure et en GMT (`Z`), l'heure de Dakar : « 2026-11-10 » seul ne doit
 * jamais devenir minuit, ni une heure sans fuseau être lue dans celui du serveur.
 */
const ISO_WITH_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

function requiredDeparture(departureAt: string | null): Date {
  const date =
    departureAt !== null && ISO_WITH_TIME.test(departureAt) ? new Date(departureAt) : null;
  if (date === null || Number.isNaN(date.getTime())) {
    throw new TripError(
      'PROPOSAL_DEPARTURE_NOT_FOUND',
      'No departure time was found in the message',
    );
  }
  return date;
}

function knownVehicle(vehicle: string | null): TripVehicle | null {
  return vehicle !== null && (TRIP_VEHICLES as readonly string[]).includes(vehicle)
    ? (vehicle as TripVehicle)
    : null;
}

function place(departurePlace: string | null): string | null {
  const trimmed = departurePlace?.trim() ?? '';
  return trimmed.length > 0 && trimmed.length <= TRIP_DEPARTURE_PLACE_MAX_LENGTH ? trimmed : null;
}

function positiveInteger(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function wholePrice(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value >= 0 ? value : null;
}
