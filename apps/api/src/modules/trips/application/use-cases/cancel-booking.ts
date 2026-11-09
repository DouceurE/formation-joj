import { Injectable } from '@nestjs/common';
import type { CancelBookingInput } from '@joj/shared';
import { bookingStatus } from '../../domain/booking-status';
import { bookingNotFound } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';
import type { BookingView } from './booking-view';

@Injectable()
export class CancelBooking {
  constructor(private readonly trips: TripRepository) {}

  async execute({ bookingCode }: CancelBookingInput): Promise<BookingView> {
    const found = await this.trips.findBookingByCode(bookingCode);
    if (!found) throw bookingNotFound(bookingCode);
    found.booking.cancel(new Date());
    await this.trips.saveBookingCancellation(found.booking);
    // Le trajet relu compte de nouveau la place libérée.
    const trip = (await this.trips.findById(found.trip.id)) ?? found.trip;
    return { booking: found.booking, trip, status: bookingStatus(found.booking, trip) };
  }
}
