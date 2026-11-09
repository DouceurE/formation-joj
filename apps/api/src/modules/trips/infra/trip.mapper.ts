import { tripSiteSchema, tripVehicleSchema } from '@joj/shared';
import { Trip } from '../domain/trip';
import type { TripRow } from './trips.schema';

/** Ligne de la table et téléphones des passagers → entité. Un véhicule ou un site inconnu en base est un bug. */
export function toDomain(row: TripRow, passengerPhones: readonly string[]): Trip {
  return Trip.restore({
    ...row,
    vehicle: tripVehicleSchema.parse(row.vehicle),
    site: tripSiteSchema.parse(row.site),
    passengerPhones,
    // La colonne arrive avec la tâche T04 de la spec 003.
    cancelledAt: null,
  });
}

/** Entité → ligne de la table. Les passagers vivent dans la table `bookings`. */
export function toRow(trip: Trip): TripRow {
  const { passengerPhones: _passengers, cancelledAt: _cancelledAt, ...row } = trip.toProps();
  return row;
}
