import { Injectable } from '@nestjs/common';
import { bookingStatus } from '../../domain/booking-status';
import { bookingNotFound } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';
import type { BookingView } from './booking-view';

@Injectable()
export class GetBooking {
  constructor(private readonly trips: TripRepository) {}

  async execute(code: string): Promise<BookingView> {
    const found = await this.trips.findBookingByCode(code);
    if (!found) throw bookingNotFound(code);
    return { ...found, status: bookingStatus(found.booking, found.trip) };
  }
}
