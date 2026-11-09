import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { TripExtractor } from './application/trip-extractor';
import { TripRepository } from './application/trip.repository';
import { BookSeat } from './application/use-cases/book-seat';
import { CancelBooking } from './application/use-cases/cancel-booking';
import { CancelTrip } from './application/use-cases/cancel-trip';
import { GetBooking } from './application/use-cases/get-booking';
import { ListOfficialLines } from './application/use-cases/list-official-lines';
import { ListTrips } from './application/use-cases/list-trips';
import { ProposeTripFromMessage } from './application/use-cases/propose-trip-from-message';
import { PublishTrip } from './application/use-cases/publish-trip';
import { BookingsController } from './http/bookings.controller';
import { OfficialLinesController } from './http/official-lines.controller';
import { TripsController } from './http/trips.controller';
import { ANTHROPIC_CLIENT, ClaudeTripExtractor } from './infra/claude-trip-extractor';
import { DrizzleTripRepository } from './infra/drizzle-trip.repository';

@Module({
  controllers: [TripsController, BookingsController, OfficialLinesController],
  providers: [
    // Les ports (classes abstraites) sont reliés ici à leurs implémentations.
    { provide: TripRepository, useClass: DrizzleTripRepository },
    { provide: TripExtractor, useClass: ClaudeTripExtractor },
    // Le SDK lit ANTHROPIC_API_KEY ; sans clé, l'appel échoue et l'assistant est « indisponible ».
    { provide: ANTHROPIC_CLIENT, useFactory: () => new Anthropic() },
    PublishTrip,
    ListTrips,
    BookSeat,
    CancelTrip,
    CancelBooking,
    GetBooking,
    ListOfficialLines,
    ProposeTripFromMessage,
  ],
})
export class TripsModule {}
