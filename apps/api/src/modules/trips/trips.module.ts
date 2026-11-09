import { Module } from '@nestjs/common';
import { TripRepository } from './application/trip.repository';
import { BookSeat } from './application/use-cases/book-seat';
import { CancelBooking } from './application/use-cases/cancel-booking';
import { CancelTrip } from './application/use-cases/cancel-trip';
import { GetBooking } from './application/use-cases/get-booking';
import { ListTrips } from './application/use-cases/list-trips';
import { PublishTrip } from './application/use-cases/publish-trip';
import { BookingsController } from './http/bookings.controller';
import { TripsController } from './http/trips.controller';
import { DrizzleTripRepository } from './infra/drizzle-trip.repository';

@Module({
  controllers: [TripsController, BookingsController],
  providers: [
    // Le port (classe abstraite) est relié ici à son implémentation Drizzle.
    { provide: TripRepository, useClass: DrizzleTripRepository },
    PublishTrip,
    ListTrips,
    BookSeat,
    CancelTrip,
    CancelBooking,
    GetBooking,
  ],
})
export class TripsModule {}
