import type { TripSite } from '@joj/shared';
import type { Booking } from '../../domain/booking';
import { Trip } from '../../domain/trip';
import { tripAlreadyBooked, tripFull, tripNotFound } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';

/** Fake fidèle au contrat du port (filtre, tri, refus à l'écriture), pour tester sans base. */
export class InMemoryTripRepository extends TripRepository {
  private readonly rows = new Map<string, Trip>();
  /** Les réservations enregistrées, lisibles par les tests. */
  readonly bookings: Booking[] = [];

  async findById(id: string): Promise<Trip | null> {
    const found = this.rows.get(id);
    return found ? this.withPassengers(found) : null;
  }

  async insert(trip: Trip): Promise<void> {
    this.rows.set(trip.id, trip);
  }

  /** Comme la base : trajet inconnu, téléphone déjà inscrit et trajet complet sont refusés. */
  async addBooking(booking: Booking): Promise<void> {
    const trip = this.rows.get(booking.tripId);
    if (!trip) throw tripNotFound(booking.tripId);
    const phones = this.phonesOf(trip.id);
    if (phones.includes(booking.passengerPhone)) throw tripAlreadyBooked(trip.id);
    if (phones.length >= trip.seats) throw tripFull(trip.id, trip.seats);
    this.bookings.push(booking);
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
      .map((trip) => this.withPassengers(trip));
  }

  private phonesOf(tripId: string): string[] {
    return this.bookings
      .filter((booking) => booking.tripId === tripId)
      .map((booking) => booking.passengerPhone);
  }

  /** Copie avec les passagers enregistrés : un test ne voit que ce qui a été persisté. */
  private withPassengers(trip: Trip): Trip {
    return Trip.restore({ ...trip.toProps(), passengerPhones: this.phonesOf(trip.id) });
  }
}
