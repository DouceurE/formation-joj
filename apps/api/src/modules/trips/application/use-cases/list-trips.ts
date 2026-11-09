import { Injectable } from '@nestjs/common';
import type { ListTripsQuery } from '@joj/shared';
import type { Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ListTrips {
  constructor(private readonly trips: TripRepository) {}

  /** La journée va de minuit à minuit à Dakar, qui vit à l'heure GMT toute l'année. */
  async execute({ site, date }: ListTripsQuery): Promise<Trip[]> {
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(from.getTime() + ONE_DAY_MS);
    return this.trips.listBySiteBetween(site, from, to);
  }
}
