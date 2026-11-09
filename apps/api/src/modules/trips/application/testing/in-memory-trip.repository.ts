import type { TripSite } from '@joj/shared';
import { Booking } from '../../domain/booking';
import { Trip } from '../../domain/trip';
import {
  bookingAlreadyCancelled,
  tripAlreadyBooked,
  tripAlreadyCancelled,
  tripCancelled,
  tripFull,
  tripNotFound,
} from '../../domain/trips.errors';
import { type BookingWithTrip, TripRepository } from '../trip.repository';

/** Fake fidèle au contrat du port (filtre, tri, refus à l'écriture), pour tester sans base. */
export class InMemoryTripRepository extends TripRepository {
  private readonly rows = new Map<string, Trip>();
  private readonly bookingRows = new Map<string, Booking>();

  /** Les réservations enregistrées, en copie, lisibles par les tests. */
  get bookings(): Booking[] {
    return [...this.bookingRows.values()].map(copyBooking);
  }

  async findById(id: string): Promise<Trip | null> {
    const found = this.rows.get(id);
    return found ? this.withPassengers(found) : null;
  }

  async findByManagementCode(code: string): Promise<Trip | null> {
    const found = [...this.rows.values()].find((trip) => trip.managementCode === code);
    return found ? this.withPassengers(found) : null;
  }

  async findBookingByCode(code: string): Promise<BookingWithTrip | null> {
    const booking = [...this.bookingRows.values()].find((row) => row.bookingCode === code);
    const trip = booking ? this.rows.get(booking.tripId) : undefined;
    if (!booking || !trip) return null;
    return { booking: copyBooking(booking), trip: this.withPassengers(trip) };
  }

  /** Une copie : un test ne voit pas une modification qui n'a pas été persistée. */
  async insert(trip: Trip): Promise<void> {
    this.rows.set(trip.id, Trip.restore(trip.toProps()));
  }

  /** Comme la base : trajet inconnu ou annulé, téléphone déjà inscrit et trajet complet sont refusés. */
  async addBooking(booking: Booking): Promise<void> {
    const trip = this.rows.get(booking.tripId);
    if (!trip) throw tripNotFound(booking.tripId);
    if (trip.cancelledAt) throw tripCancelled(trip.id);
    const phones = this.activePhonesOf(trip.id);
    if (phones.includes(booking.passengerPhone)) throw tripAlreadyBooked(trip.id);
    if (phones.length >= trip.seats) throw tripFull(trip.id, trip.seats);
    this.bookingRows.set(booking.id, copyBooking(booking));
  }

  async saveTripCancellation(trip: Trip): Promise<void> {
    const stored = this.rows.get(trip.id);
    if (!stored) throw tripNotFound(trip.id);
    if (stored.cancelledAt) throw tripAlreadyCancelled(trip.id);
    this.rows.set(trip.id, Trip.restore({ ...stored.toProps(), cancelledAt: trip.cancelledAt }));
  }

  async saveBookingCancellation(booking: Booking): Promise<void> {
    if (this.bookingRows.get(booking.id)?.cancelledAt) throw bookingAlreadyCancelled(booking.id);
    this.bookingRows.set(booking.id, copyBooking(booking));
  }

  async listBySiteBetween(site: TripSite, from: Date, to: Date): Promise<Trip[]> {
    return [...this.rows.values()]
      .filter(
        (trip) =>
          trip.site === site &&
          !trip.cancelledAt &&
          trip.departureAt.getTime() >= from.getTime() &&
          trip.departureAt.getTime() < to.getTime(),
      )
      .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime())
      .map((trip) => this.withPassengers(trip));
  }

  /** Seules les réservations actives occupent une place. */
  private activePhonesOf(tripId: string): string[] {
    return [...this.bookingRows.values()]
      .filter((booking) => booking.tripId === tripId && !booking.cancelledAt)
      .map((booking) => booking.passengerPhone);
  }

  /** Copie avec les passagers enregistrés : un test ne voit que ce qui a été persisté. */
  private withPassengers(trip: Trip): Trip {
    return Trip.restore({ ...trip.toProps(), passengerPhones: this.activePhonesOf(trip.id) });
  }
}

function copyBooking(booking: Booking): Booking {
  return Booking.restore(booking.toProps());
}
