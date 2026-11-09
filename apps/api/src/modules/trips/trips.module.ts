import { Module } from '@nestjs/common';
import { TripRepository } from './application/trip.repository';
import { ListTrips } from './application/use-cases/list-trips';
import { PublishTrip } from './application/use-cases/publish-trip';
import { TripsController } from './http/trips.controller';
import { DrizzleTripRepository } from './infra/drizzle-trip.repository';

@Module({
  controllers: [TripsController],
  providers: [
    // Le port (classe abstraite) est relié ici à son implémentation Drizzle.
    { provide: TripRepository, useClass: DrizzleTripRepository },
    PublishTrip,
    ListTrips,
  ],
})
export class TripsModule {}
