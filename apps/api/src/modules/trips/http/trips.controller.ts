import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  listTripsQuerySchema,
  type PublishedTripResponse,
  publishedTripSchema,
  publishTripSchema,
  type TripResponse,
  tripSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { ListTrips } from '../application/use-cases/list-trips';
import { PublishTrip } from '../application/use-cases/publish-trip';
import type { Trip } from '../domain/trip';

class PublishTripDto extends createZodDto(publishTripSchema) {}
class ListTripsQueryDto extends createZodDto(listTripsQuerySchema) {}
class TripDto extends createZodDto(tripSchema) {}
class PublishedTripDto extends createZodDto(publishedTripSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly publishTrip: PublishTrip,
    private readonly listTrips: ListTrips,
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
