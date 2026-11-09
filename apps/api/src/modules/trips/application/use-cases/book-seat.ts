import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BookSeatInput } from '@joj/shared';
import { Booking } from '../../domain/booking';
import type { Trip } from '../../domain/trip';
import { tripNotFound } from '../../domain/trips.errors';
import { generateBookingCode } from '../management-code';
import { TripRepository } from '../trip.repository';

/** Ce que reçoit le supporter : sa réservation, et le trajet pour le lieu, l'heure et le conducteur. */
export interface BookingConfirmation {
  booking: Booking;
  trip: Trip;
}

@Injectable()
export class BookSeat {
  constructor(private readonly trips: TripRepository) {}

  async execute(tripId: string, input: BookSeatInput): Promise<BookingConfirmation> {
    const trip = await this.trips.findById(tripId);
    if (!trip) throw tripNotFound(tripId);
    const now = new Date();
    const booking = Booking.create({
      ...input,
      id: randomUUID(),
      bookingCode: generateBookingCode(),
      tripId,
      now,
    });
    // Message clair dans le cas courant ; addBooking() revérifie sous verrou.
    trip.book(booking, now);
    await this.trips.addBooking(booking);
    return { booking, trip };
  }
}
