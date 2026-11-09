import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PublishTripInput } from '@joj/shared';
import { Trip } from '../../domain/trip';
import { generateManagementCode } from '../management-code';
import { TripRepository } from '../trip.repository';

@Injectable()
export class PublishTrip {
  constructor(private readonly trips: TripRepository) {}

  async execute(input: PublishTripInput): Promise<Trip> {
    const trip = Trip.create({
      ...input,
      id: randomUUID(),
      managementCode: generateManagementCode(),
      departureAt: new Date(input.departureAt),
      now: new Date(),
    });
    await this.trips.insert(trip);
    return trip;
  }
}
