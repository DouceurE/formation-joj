import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type BookingConfirmationResponse,
  bookingConfirmationSchema,
  bookSeatSchema,
  listTripsQuerySchema,
  type PublishedTripResponse,
  publishedTripSchema,
  publishTripSchema,
  type TripResponse,
  tripIdParamsSchema,
  tripSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { type BookingConfirmation, BookSeat } from '../application/use-cases/book-seat';
import { ListTrips } from '../application/use-cases/list-trips';
import { PublishTrip } from '../application/use-cases/publish-trip';
import type { Trip } from '../domain/trip';

class PublishTripDto extends createZodDto(publishTripSchema) {}
class ListTripsQueryDto extends createZodDto(listTripsQuerySchema) {}
class TripDto extends createZodDto(tripSchema) {}
class PublishedTripDto extends createZodDto(publishedTripSchema) {}
class TripIdParamsDto extends createZodDto(tripIdParamsSchema) {}
class BookSeatDto extends createZodDto(bookSeatSchema) {}
class BookingConfirmationDto extends createZodDto(bookingConfirmationSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly publishTrip: PublishTrip,
    private readonly listTrips: ListTrips,
    private readonly bookSeat: BookSeat,
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
