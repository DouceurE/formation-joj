import { Inject, Injectable } from '@nestjs/common';
import type { TripSite } from '@joj/shared';
import { and, asc, count, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { isUniqueViolation } from '../../../core/database/pg-errors';
import { type BookingWithTrip, TripRepository } from '../application/trip.repository';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';
import {
  bookingAlreadyCancelled,
  tripAlreadyBooked,
  tripAlreadyCancelled,
  tripCancelled,
  tripFull,
  tripNotFound,
} from '../domain/trips.errors';
import { toDomain as bookingToDomain, toRow as bookingToRow } from './booking.mapper';
import { toDomain, toRow } from './trip.mapper';
import { BOOKINGS_TRIP_PASSENGER_KEY, bookings, trips } from './trips.schema';

/** Seules les réservations actives occupent une place. */
const activeBooking = isNull(bookings.cancelledAt);

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

  async findByManagementCode(code: string): Promise<Trip | null> {
    const [row] = await this.db.select().from(trips).where(eq(trips.managementCode, code)).limit(1);
    if (!row) return null;
    return toDomain(row, (await this.phonesByTrip([row.id])).get(row.id) ?? []);
  }

  async findBookingByCode(code: string): Promise<BookingWithTrip | null> {
    const [row] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingCode, code))
      .limit(1);
    const trip = row ? await this.findById(row.tripId) : null;
    return row && trip ? { booking: bookingToDomain(row), trip } : null;
  }

  async insert(trip: Trip): Promise<void> {
    await this.db.insert(trips).values(toRow(trip));
  }

  /**
   * Verrouille la ligne du trajet, revérifie l'annulation, recompte, puis écrit : deux
   * réservations simultanées passent l'une après l'autre, et la seconde voit la place prise.
   */
  async addBooking(booking: Booking): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        const [trip] = await tx
          .select({ id: trips.id, seats: trips.seats, cancelledAt: trips.cancelledAt })
          .from(trips)
          .where(eq(trips.id, booking.tripId))
          .for('update');
        if (!trip) throw tripNotFound(booking.tripId);
        if (trip.cancelledAt) throw tripCancelled(trip.id);
        const [taken] = await tx
          .select({ value: count() })
          .from(bookings)
          .where(and(eq(bookings.tripId, trip.id), activeBooking));
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

  /** N'écrit que si le trajet n'était pas annulé : la seconde de deux annulations simultanées échoue. */
  async saveTripCancellation(trip: Trip): Promise<void> {
    const updated = await this.db
      .update(trips)
      .set({ cancelledAt: trip.cancelledAt })
      .where(and(eq(trips.id, trip.id), isNull(trips.cancelledAt)))
      .returning({ id: trips.id });
    if (updated.length === 0) throw tripAlreadyCancelled(trip.id);
  }

  /** N'écrit que si la réservation n'était pas annulée : la seconde de deux annulations simultanées échoue. */
  async saveBookingCancellation(booking: Booking): Promise<void> {
    const updated = await this.db
      .update(bookings)
      .set({ cancelledAt: booking.cancelledAt })
      .where(and(eq(bookings.id, booking.id), activeBooking))
      .returning({ id: bookings.id });
    if (updated.length === 0) throw bookingAlreadyCancelled(booking.id);
  }

  async listBySiteBetween(site: TripSite, from: Date, to: Date): Promise<Trip[]> {
    const rows = await this.db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.site, site),
          isNull(trips.cancelledAt),
          gte(trips.departureAt, from),
          lt(trips.departureAt, to),
        ),
      )
      .orderBy(asc(trips.departureAt));
    const phones = await this.phonesByTrip(rows.map((row) => row.id));
    return rows.map((row) => toDomain(row, phones.get(row.id) ?? []));
  }

  /** Les téléphones des passagers actifs de chaque trajet, en une seule requête. */
  private async phonesByTrip(tripIds: string[]): Promise<Map<string, string[]>> {
    const phones = new Map<string, string[]>();
    if (tripIds.length === 0) return phones;
    const rows = await this.db
      .select({ tripId: bookings.tripId, phone: bookings.passengerPhone })
      .from(bookings)
      .where(and(inArray(bookings.tripId, tripIds), activeBooking))
      .orderBy(asc(bookings.createdAt));
    for (const { tripId, phone } of rows) {
      phones.set(tripId, [...(phones.get(tripId) ?? []), phone]);
    }
    return phones;
  }
}
