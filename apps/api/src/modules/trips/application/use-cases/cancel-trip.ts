import { Injectable } from '@nestjs/common';
import type { CancelTripInput } from '@joj/shared';
import type { Trip } from '../../domain/trip';
import { TripError } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';

/** Le trajet annulé, et l'instant de son annulation. */
export interface CancelledTrip {
  trip: Trip;
  cancelledAt: Date;
}

@Injectable()
export class CancelTrip {
  constructor(private readonly trips: TripRepository) {}

  async execute({ managementCode }: CancelTripInput): Promise<CancelledTrip> {
    const trip = await this.trips.findByManagementCode(managementCode);
    // Le code n'est pas renvoyé dans l'erreur : c'est un secret du conducteur.
    if (!trip) throw new TripError('TRIP_NOT_FOUND', 'No trip with this management code');
    const cancelledAt = new Date();
    trip.cancel(cancelledAt);
    await this.trips.saveTripCancellation(trip);
    return { trip, cancelledAt };
  }
}
