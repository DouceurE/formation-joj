import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type BookingConfirmationResponse,
  bookingConfirmationSchema,
  bookSeatSchema,
  type CancelledTripResponse,
  cancelledTripSchema,
  cancelTripSchema,
  listTripsQuerySchema,
  type PublishedTripResponse,
  publishedTripSchema,
  publishTripSchema,
  proposeTripSchema,
  type TripProposalResponse,
  tripProposalSchema,
  type TripResponse,
  tripIdParamsSchema,
  tripSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { type BookingConfirmation, BookSeat } from '../application/use-cases/book-seat';
import { CancelTrip } from '../application/use-cases/cancel-trip';
import { ListTrips } from '../application/use-cases/list-trips';
import { ProposeTripFromMessage } from '../application/use-cases/propose-trip-from-message';
import { PublishTrip } from '../application/use-cases/publish-trip';
import type { Trip } from '../domain/trip';

class PublishTripDto extends createZodDto(publishTripSchema) {}
class ListTripsQueryDto extends createZodDto(listTripsQuerySchema) {}
class TripDto extends createZodDto(tripSchema) {}
class PublishedTripDto extends createZodDto(publishedTripSchema) {}
class TripIdParamsDto extends createZodDto(tripIdParamsSchema) {}
class BookSeatDto extends createZodDto(bookSeatSchema) {}
class BookingConfirmationDto extends createZodDto(bookingConfirmationSchema) {}
class CancelTripDto extends createZodDto(cancelTripSchema) {}
class CancelledTripDto extends createZodDto(cancelledTripSchema) {}
class ProposeTripDto extends createZodDto(proposeTripSchema) {}
class TripProposalDto extends createZodDto(tripProposalSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly publishTrip: PublishTrip,
    private readonly listTrips: ListTrips,
    private readonly bookSeat: BookSeat,
    private readonly cancelTrip: CancelTrip,
    private readonly proposeTripFromMessage: ProposeTripFromMessage,
  ) {}

  @Post()
  @ZodSerializerDto(PublishedTripDto)
  async publish(@Body() body: PublishTripDto): Promise<PublishedTripResponse> {
    const trip = await this.publishTrip.execute(body);
    // Le code de gestion n'est remis qu'ici, au conducteur qui publie.
    return { ...toResponse(trip), managementCode: trip.managementCode };
  }

  @Get()
  @ZodSerializerDto([TripDto])
  async list(@Query() query: ListTripsQueryDto): Promise<TripResponse[]> {
    return (await this.listTrips.execute(query)).map(toResponse);
  }

  @Post('cancel')
  @HttpCode(200)
  @ZodSerializerDto(CancelledTripDto)
  async cancel(@Body() body: CancelTripDto): Promise<CancelledTripResponse> {
    const { trip, cancelledAt } = await this.cancelTrip.execute(body);
    return { id: trip.id, cancelledAt: cancelledAt.toISOString() };
  }

  @Post('proposals')
  @HttpCode(200)
  @ZodSerializerDto(TripProposalDto)
  async propose(@Body() body: ProposeTripDto): Promise<TripProposalResponse> {
    const proposal = await this.proposeTripFromMessage.execute(body);
    // Rien n'est publié : le conducteur relit, complète, puis appelle POST /api/trips.
    return { ...proposal, departureAt: proposal.departureAt.toISOString() };
  }

  @Post(':id/bookings')
  @ZodSerializerDto(BookingConfirmationDto)
  async book(
    @Param() { id }: TripIdParamsDto,
    @Body() body: BookSeatDto,
  ): Promise<BookingConfirmationResponse> {
    return toConfirmation(await this.bookSeat.execute(id, body));
  }
}

/** Ni le téléphone du conducteur ni le code de gestion : la liste est publique. */
function toResponse(trip: Trip): TripResponse {
  return {
    id: trip.id,
    vehicle: trip.vehicle,
    departurePlace: trip.departurePlace,
    site: trip.site,
    departureAt: trip.departureAt.toISOString(),
    seats: trip.seats,
    remainingSeats: trip.remainingSeats,
    priceFcfa: trip.priceFcfa,
    createdAt: trip.createdAt.toISOString(),
  };
}

/** Le téléphone du conducteur n'est donné qu'au supporter qui a réservé. */
function toConfirmation({ booking, trip }: BookingConfirmation): BookingConfirmationResponse {
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    tripId: trip.id,
    passengerName: booking.passengerName,
    departurePlace: trip.departurePlace,
    departureAt: trip.departureAt.toISOString(),
    driverPhone: trip.driverPhone,
    createdAt: booking.createdAt.toISOString(),
  };
}
