import type { TripSite } from '@joj/shared';
import type { Trip } from '../domain/trip';

/**
 * Port de persistance : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleTripRepository (infra) et InMemoryTripRepository (tests).
 */
export abstract class TripRepository {
  abstract insert(trip: Trip): Promise<void>;
  /** Les trajets du site dont le départ est dans [from, to[, triés par heure de départ. */
  abstract listBySiteBetween(site: TripSite, from: Date, to: Date): Promise<Trip[]>;
}
