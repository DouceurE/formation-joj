import { tripSiteSchema, tripVehicleSchema } from '@joj/shared';
import { Trip } from '../domain/trip';
import type { TripRow } from './trips.schema';

/** Ligne de la table → entité. Un véhicule ou un site inconnu en base est un bug : on échoue tôt. */
export function toDomain(row: TripRow): Trip {
  return Trip.restore({
    ...row,
    vehicle: tripVehicleSchema.parse(row.vehicle),
    site: tripSiteSchema.parse(row.site),
  });
}

/** Entité → ligne de la table. */
export function toRow(trip: Trip): TripRow {
  return trip.toProps();
}
