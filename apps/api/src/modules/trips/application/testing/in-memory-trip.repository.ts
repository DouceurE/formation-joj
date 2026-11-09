import type { TripSite } from '@joj/shared';
import { Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';

/** Fake fidèle au contrat du port (filtre et tri), pour tester l'application sans base. */
export class InMemoryTripRepository extends TripRepository {
  private readonly rows = new Map<string, Trip>();

  async insert(trip: Trip): Promise<void> {
    this.rows.set(trip.id, clone(trip));
  }

  async listBySiteBetween(site: TripSite, from: Date, to: Date): Promise<Trip[]> {
    return [...this.rows.values()]
      .filter(
        (trip) =>
          trip.site === site &&
          trip.departureAt.getTime() >= from.getTime() &&
          trip.departureAt.getTime() < to.getTime(),
      )
      .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime())
      .map(clone);
  }
}

/** Copie : un test ne voit pas une modification qui n'a pas été persistée. */
function clone(trip: Trip): Trip {
  return Trip.restore(trip.toProps());
}
