import { Inject, Injectable } from '@nestjs/common';
import type { TripSite } from '@joj/shared';
import { and, asc, count, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { isUniqueViolation } from '../../../core/database/pg-errors';
import { type BookingWithTrip, TripRepository } from '../application/trip.repository';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';
import { tripAlreadyBooked, tripFull, tripNotFound } from '../domain/trips.errors';
import { toRow as bookingToRow } from './booking.mapper';
import { toDomain, toRow } from './trip.mapper';
import { BOOKINGS_TRIP_PASSENGER_KEY, bookings, trips } from './trips.schema';

@Injectable()
export class DrizzleTripRepository extends TripRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async findById(id: string): Promise<Trip | null> {
    const [row] = await this.db.select().from(trips).where(eq(trips.id, id)).limit(1);
    if (!row) return null;
    return toDomain(row, (await this.phonesByTrip([id])).get(id) ?? []);
  }

  async findByManagementCode(_code: string): Promise<Trip | null> {
    throw new Error('non implémenté');
  }

  async findBookingByCode(_code: string): Promise<BookingWithTrip | null> {
    throw new Error('non implémenté');
  }

  async saveTripCancellation(_trip: Trip): Promise<void> {
    throw new Error('non implémenté');
  }

  async saveBookingCancellation(_booking: Booking): Promise<void> {
    throw new Error('non implémenté');
  }

  async insert(trip: Trip): Promise<void> {
    await this.db.insert(trips).values(toRow(trip));
  }

  /**
   * Verrouille la ligne du trajet, recompte, puis écrit : deux réservations simultanées
   * passent l'une après l'autre, et la seconde voit la place prise.
   */
  async addBooking(booking: Booking): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        const [trip] = await tx
          .select({ id: trips.id, seats: trips.seats })
          .from(trips)
          .where(eq(trips.id, booking.tripId))
          .for('update');
        if (!trip) throw tripNotFound(booking.tripId);
        const [taken] = await tx
          .select({ value: count() })
          .from(bookings)
          .where(eq(bookings.tripId, trip.id));
        if ((taken?.value ?? 0) >= trip.seats) throw tripFull(trip.id, trip.seats);
        await tx.insert(bookings).values(bookingToRow(booking));
      });
    } catch (error) {
      if (isUniqueViolation(error, BOOKINGS_TRIP_PASSENGER_KEY)) {
        throw tripAlreadyBooked(booking.tripId);
      }
      throw error;
    }
  }

  async listBySiteBetween(site: TripSite, from: Date, to: Date): Promise<Trip[]> {
    const rows = await this.db
      .select()
      .from(trips)
      .where(and(eq(trips.site, site), gte(trips.departureAt, from), lt(trips.departureAt, to)))
      .orderBy(asc(trips.departureAt));
    const phones = await this.phonesByTrip(rows.map((row) => row.id));
    return rows.map((row) => toDomain(row, phones.get(row.id) ?? []));
  }

  /** Les téléphones des passagers de chaque trajet, en une seule requête. */
  private async phonesByTrip(tripIds: string[]): Promise<Map<string, string[]>> {
    const phones = new Map<string, string[]>();
    if (tripIds.length === 0) return phones;
    const rows = await this.db
      .select({ tripId: bookings.tripId, phone: bookings.passengerPhone })
      .from(bookings)
      .where(inArray(bookings.tripId, tripIds))
      .orderBy(asc(bookings.createdAt));
    for (const { tripId, phone } of rows) {
      phones.set(tripId, [...(phones.get(tripId) ?? []), phone]);
    }
    return phones;
  }
}
